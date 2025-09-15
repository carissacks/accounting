import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
// NOTES: Moving this to service to keep the business logic out of
// controller and to implement Sequelize transactions
export class TicketsService {
  constructor(private sequelize: Sequelize) {}

  async findAll() {
    return await Ticket.findAll({ include: [User] });
  }

  async findExistingOpenTickets(companyId: number, type: TicketType) {
    return await Ticket.findOne({
      where: {
        companyId,
        type,
        status: TicketStatus.open,
      },
    });
  }

  async getManagementReportAssignee(companyId: number) {
    const userRole = UserRole.accountant;

    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    return { assigneeId: assignees?.[0]?.id ?? null, userRoles: [userRole] };
  }

  async getRegistrationAddressChangeAssignee(companyId: number) {
    const userRoles = [UserRole.corporateSecretary, UserRole.director];

    for (const role of userRoles) {
      const users = await User.findAll({
        where: { companyId, role },
      });
      if (users.length > 1) {
        throw new UnprocessableEntityException(
          `Multiple users with role ${role}. Cannot create a ticket`,
        );
      } else if (users.length === 1) {
        return { assigneeId: users[0].id ?? null, userRoles: [role] };
      }
    }

    return { assigneeId: null, userRoles };
  }

  async getStrikeOffAssignee(companyId: number) {
    const userRole = UserRole.director;
    const assignees = await User.findAll({
      where: { companyId, role: userRole },
    });
    if (assignees.length > 1) {
      throw new UnprocessableEntityException(
        `Multiple users with role ${userRole}. Cannot create a ticket`,
      );
    }
    return { assigneeId: assignees?.[0]?.id ?? null, userRoles: [userRole] };
  }

  async getTicketInputBasedOnType(type: TicketType, companyId: number) {
    switch (type) {
      case TicketType.managementReport: {
        return {
          category: TicketCategory.accounting,
          ...(await this.getManagementReportAssignee(companyId)),
        };
      }
      case TicketType.registrationAddressChange: {
        return {
          category: TicketCategory.corporate,
          ...(await this.getRegistrationAddressChangeAssignee(companyId)),
        };
      }
      case TicketType.strikeOff:
        return {
          category: TicketCategory.management,
          ...(await this.getStrikeOffAssignee(companyId)),
        };
      default:
        throw new UnprocessableEntityException(
          `Unsupported ticket type: ${type}`,
        );
    }
  }

  async createStrikeOffTickets(ticketData: {
    type: TicketType;
    companyId: number;
    assigneeId: number;
    category: TicketCategory;
  }) {
    if (ticketData.type !== TicketType.strikeOff) {
      throw new UnprocessableEntityException('Ticket type must be Strike Off');
    }

    // Using transaction to ensure atomicity
    const transaction = await this.sequelize.transaction();
    try {
      const newTicket = await Ticket.create(
        {
          ...ticketData,
          status: TicketStatus.open,
        },
        { transaction },
      );

      // Update existing tickets to resolved
      await Ticket.update(
        { status: TicketStatus.resolved },
        {
          where: {
            companyId: ticketData.companyId,
            status: TicketStatus.open,
          },
          transaction,
        },
      );

      await transaction.commit();
      return newTicket;
    } catch (error) {
      await transaction.rollback();
      throw new BadRequestException('Failed to create strike off ticket');
    }
  }

  async create(ticketData: {
    type: TicketType;
    companyId: number;
    assigneeId: number;
    category: TicketCategory;
  }) {
    if (ticketData.type === TicketType.strikeOff) {
      return this.createStrikeOffTickets(ticketData);
    }

    return await Ticket.create({
      ...ticketData,
      status: TicketStatus.open,
    });
  }
}
