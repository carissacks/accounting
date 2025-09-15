import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import fs from 'fs';

jest.mock('fs', () => {
  return {
    ...jest.requireActual('fs'),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
});

describe('ReportsService', () => {
  let service: ReportsService;
  const fileContent = [
    '2021-01-01,AccountA,,100,0',
    '2021-01-02,AccountB,,0,50',
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    jest
      .mocked(fs.readdirSync)
      .mockReturnValue(['file1.csv', 'file2.noncsv'] as unknown as fs.Dirent[]);
    jest
      .mocked(fs.readFileSync)
      .mockReturnValue('2021-01-01,AccountA,,100,0\n2021-01-02,AccountB,,0,50');
    jest.mocked(fs.writeFileSync).mockImplementation(jest.fn());
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCsvFilesDetail', () => {
    it('populates allCsvFilesDetail with lines', () => {
      service.getCsvFilesDetail();

      expect(fs.readdirSync).toHaveBeenCalledWith('tmp');
      expect(fs.readFileSync).toHaveBeenCalledWith('tmp/file1.csv', 'utf-8');
      expect(service['allCsvFilesDetail']).toEqual({
        'file1.csv': fileContent,
      });
    });
  });

  // AI: Created this testing outline with AI help
  // Prompt: make test for the service,
  // following tickets.service pattern. just mock the fs import
  describe('accountsModified', () => {
    it('calculates balances from allCsvFilesDetail and writes output', async () => {
      service['allCsvFilesDetail'] = {
        'file1.csv': fileContent,
      };
      await service.accountsModified();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'out/accountsModified.csv',
        expect.stringContaining('Account,Balance'),
      );
      const output = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(output).toContain('AccountA,100.00');
      expect(output).toContain('AccountB,-50.00');
    });
  });

  // AI: Generated with AI help
  // Prompt: add test for fsModified and yearlyModified
  describe('fsModified', () => {
    it('writes correct financial statement output', () => {
      service['allCsvFilesDetail'] = {
        'file1.csv': [
          '2021-01-01,Sales Revenue,,100,80',
          '2021-01-01,Cash,,100,10',
          '2021-01-01,Cost of Goods Sold,,0,50',
          '2021-01-01,Accounts Payable,,0,20',
          '2021-01-01,Common Stock,,30,0',
        ],
      };
      service.fsModified();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'out/fsModified.csv',
        expect.stringContaining('Basic Financial Statement'),
      );
      const output = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(output).toContain('Sales Revenue,20.00');
      expect(output).toContain('Cost of Goods Sold,-50.00');
      expect(output).toContain('Cash,90.00');
      expect(output).toContain('Accounts Payable,-20.00');
      expect(output).toContain('Common Stock,30.00');
      expect(output).toContain('Net Income,70.00');
      expect(output).toContain('Total Assets,90.00');
      expect(output).toContain('Total Liabilities,-20.00');
      expect(output).toContain('Total Equity,100.00');
    });
  });

  // AI: Generated with AI help
  describe('yearlyModified', () => {
    it('writes correct yearly cash balances', () => {
      service['allCsvFilesDetail'] = {
        'file1.csv': [
          '2021-01-01,Cash,,100,0',
          '2022-01-01,Cash,,200,0',
          '2022-01-01,Other,,50,0',
        ],
        'file2.csv': ['2021-06-01,Cash,,0,20', '2022-03-01,Cash,,0,50'],
      };
      service.yearlyModified();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'out/yearlyModified.csv',
        expect.stringContaining('Financial Year,Cash Balance'),
      );
      const output = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(output).toContain('2021,80.00'); // 100-20
      expect(output).toContain('2022,150.00'); // 200-50
    });
  });
});
