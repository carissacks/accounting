import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  report() {
    return {
      'accounts.csv': this.reportsService.state('accounts'),
      'accountsAsync.csv': this.reportsService.state('accountsAsync'),
      'accountsModified.csv': this.reportsService.state('accountsModified'),
      'yearly.csv': this.reportsService.state('yearly'),
      'yearlyModified.csv': this.reportsService.state('yearlyModified'),
      'fs.csv': this.reportsService.state('fs'),
      'fsModified.csv': this.reportsService.state('fsModified'),
      getFilesDetail: this.reportsService.state('getFilesDetail'),
    };
  }

  @Post()
  // Returning 202 to indicate the request
  // has been accepted but still processing
  @HttpCode(202)
  generate() {
    // Run all report generation tasks in the background
    setImmediate(() => {
      this.reportsService.getCsvFilesDetail();
      this.reportsService.accountsModified();
      this.reportsService.accountsAsync();
      this.reportsService.accounts();
      this.reportsService.yearly();
      this.reportsService.yearlyModified();
      this.reportsService.fs();
      this.reportsService.fsModified();
    });

    return { message: 'generating reports' };
  }
}
