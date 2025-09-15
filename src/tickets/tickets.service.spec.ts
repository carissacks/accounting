import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { Company } from '../../db/models/Company';
import { User, UserRole } from '../../db/models/User';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { UnprocessableEntityException } from '@nestjs/common';
import { DbModule } from '../db.module';

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketsService],
      imports: [DbModule],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getManagementReportAssignee', () => {
    it('if there is one accountant, assign accountant', async () => {
      const company = await Company.create({ name: 'test' });
      const user = await User.create({
        name: 'Test User',
        role: UserRole.accountant,
        companyId: company.id,
      });
      const { assigneeId, userRoles } =
        await service.getManagementReportAssignee(company.id);
      expect(assigneeId).toBe(user.id);
      expect(userRoles).toEqual([UserRole.accountant]);
    });

    it('if there are multiple accountants, assign the last one', async () => {
      const company = await Company.create({ name: 'test' });
      await User.create({
        name: 'Test User',
        role: UserRole.accountant,
        companyId: company.id,
      });
      const user2 = await User.create({
        name: 'Test User',
        role: UserRole.accountant,
        companyId: company.id,
      });

      const { assigneeId, userRoles } =
        await service.getManagementReportAssignee(company.id);
      expect(assigneeId).toBe(user2.id);
      expect(userRoles).toEqual([UserRole.accountant]);
    });

    it('if there is no accountant, return null', async () => {
      const company = await Company.create({ name: 'test' });
      const { assigneeId, userRoles } =
        await service.getManagementReportAssignee(company.id);
      expect(assigneeId).toBeNull();
      expect(userRoles).toEqual([UserRole.accountant]);
    });
  });

  describe('getRegistrationAddressChangeAssignee', () => {
    it('if there is one secretary, assign secretary', async () => {
      const company = await Company.create({ name: 'test' });
      const user = await User.create({
        name: 'Test User',
        role: UserRole.corporateSecretary,
        companyId: company.id,
      });
      const { assigneeId, userRoles } =
        await service.getRegistrationAddressChangeAssignee(company.id);
      expect(assigneeId).toBe(user.id);
      expect(userRoles).toEqual([UserRole.corporateSecretary]);
    });

    it('if there are multiple secretaries, throw', async () => {
      const company = await Company.create({ name: 'test' });
      await User.create({
        name: 'Test User',
        role: UserRole.corporateSecretary,
        companyId: company.id,
      });
      await User.create({
        name: 'Test User',
        role: UserRole.corporateSecretary,
        companyId: company.id,
      });

      await expect(
        service.getRegistrationAddressChangeAssignee(company.id),
      ).rejects.toEqual(
        new UnprocessableEntityException(
          `Multiple users with role corporateSecretary. Cannot create a ticket`,
        ),
      );
    });

    it('if there is no secretary, return director', async () => {
      const company = await Company.create({ name: 'test' });
      const user = await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });

      const { assigneeId, userRoles } =
        await service.getRegistrationAddressChangeAssignee(company.id);
      expect(assigneeId).toBe(user.id);
      expect(userRoles).toEqual([UserRole.director]);
    });

    it('if there are multiple directors with no secretary, throw', async () => {
      const company = await Company.create({ name: 'test' });
      await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });
      await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });

      await expect(
        service.getRegistrationAddressChangeAssignee(company.id),
      ).rejects.toEqual(
        new UnprocessableEntityException(
          'Multiple users with role director. Cannot create a ticket',
        ),
      );
    });

    it('if there are multiple directors with one secretary, assign secretary', async () => {
      const company = await Company.create({ name: 'test' });
      await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });
      await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });
      const secretary = await User.create({
        name: 'Test User',
        role: UserRole.corporateSecretary,
        companyId: company.id,
      });

      const { assigneeId } = await service.getRegistrationAddressChangeAssignee(
        company.id,
      );
      expect(assigneeId).toBe(secretary.id);
    });

    it('if there is no secretary or director, return null', async () => {
      const company = await Company.create({ name: 'test' });
      const { assigneeId } = await service.getRegistrationAddressChangeAssignee(
        company.id,
      );
      expect(assigneeId).toBeNull();
    });
  });

  describe('getStrikeOffAssignee', () => {
    it('if there is one director, assign director', async () => {
      const company = await Company.create({ name: 'test' });
      const user = await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });
      const { assigneeId, userRoles } = await service.getStrikeOffAssignee(
        company.id,
      );
      expect(assigneeId).toBe(user.id);
      expect(userRoles).toEqual([UserRole.director]);
    });

    it('if there are multiple directors, throw', async () => {
      const company = await Company.create({ name: 'test' });
      await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });
      await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });

      await expect(service.getStrikeOffAssignee(company.id)).rejects.toEqual(
        new UnprocessableEntityException(
          `Multiple users with role director. Cannot create a ticket`,
        ),
      );
    });

    it('if there is no director, return null', async () => {
      const company = await Company.create({ name: 'test' });
      const { assigneeId, userRoles } = await service.getStrikeOffAssignee(
        company.id,
      );
      expect(assigneeId).toBeNull();
      expect(userRoles).toEqual([UserRole.director]);
    });
  });

  describe('getTicketInputBasedOnType', () => {
    it('returns category, assigneeId and userRoles', async () => {
      const company = await Company.create({ name: 'test' });
      const user = await User.create({
        name: 'Test User',
        role: UserRole.accountant,
        companyId: company.id,
      });

      const { category, assigneeId, userRoles } =
        await service.getTicketInputBasedOnType(
          TicketType.managementReport,
          company.id,
        );

      expect(category).toBe(TicketCategory.accounting);
      expect(assigneeId).toBe(user.id);
      expect(userRoles).toEqual([UserRole.accountant]);
    });

    it('if ticket is invalid type, throw', async () => {
      await expect(
        service.getTicketInputBasedOnType('Lucky777Ticket' as TicketType, 1),
      ).rejects.toEqual(
        new UnprocessableEntityException(
          'Unsupported ticket type: Lucky777Ticket',
        ),
      );
    });
  });

  describe('createStrikeOffTickets', () => {
    it('creates strikeOff ticket and resolves all existing tickets', async () => {
      const company = await Company.create({ name: 'test' });
      const otherCompany = await Company.create({ name: 'other' });

      const directorUser = await User.create({
        name: 'Test Director',
        role: UserRole.director,
        companyId: company.id,
      });
      const accountantUser = await User.create({
        name: 'Test Accountant',
        role: UserRole.accountant,
        companyId: company.id,
      });
      const otherCompanyUser = await User.create({
        name: 'Other Company User',
        role: UserRole.accountant,
        companyId: otherCompany.id,
      });

      const existingTicket = await Ticket.create({
        companyId: company.id,
        type: TicketType.managementReport,
        assigneeId: accountantUser.id,
        status: TicketStatus.open,
        category: TicketCategory.accounting,
      });
      const otherCompanyTicket = await Ticket.create({
        companyId: otherCompany.id,
        type: TicketType.managementReport,
        assigneeId: otherCompanyUser.id,
        status: TicketStatus.open,
        category: TicketCategory.accounting,
      });

      const ticket = await service.createStrikeOffTickets({
        assigneeId: directorUser.id,
        companyId: company.id,
        type: TicketType.strikeOff,
        category: TicketCategory.management,
      });

      expect(ticket.category).toBe(TicketCategory.management);
      expect(ticket.assigneeId).toBe(directorUser.id);
      expect(ticket.status).toBe(TicketStatus.open);

      const updatedExistingTicket = await Ticket.findByPk(existingTicket.id);
      expect(updatedExistingTicket?.status).toBe(TicketStatus.resolved);

      const unchangedOtherCompanyTicket = await Ticket.findByPk(
        otherCompanyTicket.id,
      );
      expect(unchangedOtherCompanyTicket?.status).toBe(TicketStatus.open);
    });

    it('if ticket type is not strikeOff, throw', async () => {
      await expect(
        service.createStrikeOffTickets({
          assigneeId: 1,
          companyId: 1,
          type: TicketType.managementReport,
          category: TicketCategory.management,
        }),
      ).rejects.toEqual(
        new UnprocessableEntityException('Ticket type must be Strike Off'),
      );
    });
    // TODO: Add tests for transaction rollback
  });
});
