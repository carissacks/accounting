import {
  Body,
  Controller,
  Get,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { TicketsService } from './tickets.service';

interface newTicketDto {
  type: TicketType;
  companyId: number;
}

interface TicketDto {
  id: number;
  type: TicketType;
  companyId: number;
  assigneeId: number;
  status: TicketStatus;
  category: TicketCategory;
}

@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  async findAll() {
    return await this.ticketsService.findAll();
  }

  @Post()
  async create(@Body() newTicketDto: newTicketDto) {
    const { type, companyId } = newTicketDto;

    if (type === TicketType.registrationAddressChange) {
      const existingTickets = await this.ticketsService.findExistingOpenTickets(
        companyId,
        type,
      );
      if (existingTickets) {
        throw new UnprocessableEntityException(
          `There is an open ticket for registration address change for company id: ${companyId}`,
        );
      }
    }

    const { category, assigneeId, userRoles } =
      await this.ticketsService.getTicketInputBasedOnType(type, companyId);

    if (assigneeId == null)
      throw new UnprocessableEntityException(
        `Cannot find user with role ${userRoles.length > 1 ? userRoles.join(', ') : userRoles[0]} to create a ticket`,
      );

    const ticket = await this.ticketsService.create({
      type,
      companyId,
      assigneeId,
      category,
    });

    const ticketDto: TicketDto = {
      id: ticket.id,
      type: ticket.type,
      assigneeId: ticket.assigneeId,
      status: ticket.status,
      category: ticket.category,
      companyId: ticket.companyId,
    };

    return ticketDto;
  }
}
