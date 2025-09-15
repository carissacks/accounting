import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

@Injectable()
export class ReportsService {
  private states = {
    accounts: 'idle',
    accountsAsync: 'idle',
    accountsModified: 'idle',
    yearly: 'idle',
    yearlyModified: 'idle',
    fs: 'idle',
    fsModified: 'idle',
    getFilesDetail: 'idle',
  };

  private allCsvFilesDetail: Record<string, Array<string>> = {};
  private tmpDir = 'tmp';

  state(scope: string) {
    return this.states[scope];
  }

  accounts() {
    this.states.accounts = 'starting';
    const start = performance.now();
    const tmpDir = 'tmp';
    const outputFile = 'out/accounts.csv';
    const accountBalances: Record<string, number> = {};
    fs.readdirSync(tmpDir).forEach((file) => {
      if (file.endsWith('.csv')) {
        const lines = fs
          .readFileSync(path.join(tmpDir, file), 'utf-8')
          .trim()
          .split('\n');
        for (const line of lines) {
          const [, account, , debit, credit] = line.split(',');
          if (!accountBalances[account]) {
            accountBalances[account] = 0;
          }
          accountBalances[account] +=
            parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
        }
      }
    });
    const output = ['Account,Balance'];
    for (const [account, balance] of Object.entries(accountBalances)) {
      output.push(`${account},${balance.toFixed(2)}`);
    }
    fs.writeFileSync(outputFile, output.join('\n'));
    this.states.accounts = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  getCsvFiles() {
    return fs.readdirSync(this.tmpDir).filter((file) => file.endsWith('.csv'));
  }

  // NOTES: These reports have the same data source;
  // Thus reading the files once and storing the content
  // in memory to speed up processing
  getCsvFilesDetail() {
    this.states.getFilesDetail = 'starting';
    const start = performance.now();

    this.getCsvFiles().forEach((file) => {
      const lines = fs
        // NOTES: Tried reading files asynchronously but it was slower
        .readFileSync(path.join(this.tmpDir, file), 'utf-8')
        .trim()
        .split('\n');
      this.allCsvFilesDetail[file] = lines;
    });
    this.states.getFilesDetail = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  accountsModified() {
    console.log('accountsModified start');
    this.states.accountsModified = 'starting';
    const start = performance.now();
    const outputFile = 'out/accountsModified.csv';

    // NOTES: Ran a test with Map and it was slower than using a plain object
    const accountBalances: Record<string, number> = {};

    Object.entries(this.allCsvFilesDetail).forEach(([_file, lines]) => {
      for (const line of lines) {
        const [, account, , debit, credit] = line.split(',');
        const balance = parseFloat(debit || '0') - parseFloat(credit || '0');
        if (!accountBalances[account]) {
          accountBalances[account] = balance;
          continue;
        }
        accountBalances[account] += balance;
      }
    });

    const output = ['Account,Balance'];
    for (const [account, balance] of Object.entries(accountBalances)) {
      output.push(`${account},${balance.toFixed(2)}`);
    }
    fs.writeFileSync(outputFile, output.join('\n'));
    this.states.accountsModified = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
    console.log('accountsModified end');
  }

  async accountsAsync() {
    // AI: I used AI here asking how they'd improve the performance
    // and it suggested using asynchronous file reading
    this.states.accountsAsync = 'starting';
    const start = performance.now();
    const tmpDir = 'tmp';
    const outputFile = 'out/accounts0.csv';
    const accountBalances: Record<string, number> = {};

    const files = fs
      .readdirSync(tmpDir)
      .filter((file) => file.endsWith('.csv'));
    const processingFile = files.map(async (file) => {
      const localBalances: Record<string, number> = {};
      const data = await fs.promises.readFile(path.join(tmpDir, file), 'utf-8');
      const lines = data.trim().split('\n');
      for (const line of lines) {
        const [, account, , debit, credit] = line.split(',');
        if (!localBalances[account]) {
          localBalances[account] = 0;
        }
        localBalances[account] +=
          parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
      }
      return localBalances;
    });

    const filesResult = await Promise.all(processingFile);

    for (const localBalances of filesResult) {
      for (const [account, balance] of Object.entries(localBalances)) {
        if (!accountBalances[account]) {
          accountBalances[account] = 0;
        }
        accountBalances[account] += balance;
      }
    }

    const output = ['Account,Balance'];
    for (const [account, balance] of Object.entries(accountBalances)) {
      output.push(`${account},${balance.toFixed(2)}`);
    }
    fs.writeFileSync(outputFile, output.join('\n'));
    this.states.accountsAsync = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  yearly() {
    this.states.yearly = 'starting';
    const start = performance.now();
    const tmpDir = 'tmp';
    const outputFile = 'out/yearly.csv';
    const cashByYear: Record<string, number> = {};
    fs.readdirSync(tmpDir).forEach((file) => {
      if (file.endsWith('.csv') && file !== 'yearly.csv') {
        const lines = fs
          .readFileSync(path.join(tmpDir, file), 'utf-8')
          .trim()
          .split('\n');
        for (const line of lines) {
          const [date, account, , debit, credit] = line.split(',');
          if (account === 'Cash') {
            const year = new Date(date).getFullYear();
            if (!cashByYear[year]) {
              cashByYear[year] = 0;
            }
            cashByYear[year] +=
              parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
          }
        }
      }
    });

    const output = ['Financial Year,Cash Balance'];
    Object.keys(cashByYear)
      .sort()
      .forEach((year) => {
        output.push(`${year},${cashByYear[year].toFixed(2)}`);
      });
    fs.writeFileSync(outputFile, output.join('\n'));
    this.states.yearly = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  yearlyModified() {
    this.states.yearlyModified = 'starting';
    const start = performance.now();
    const outputFile = 'out/yearlyModified.csv';
    const cashByYear: Record<string, number> = {};

    Object.entries(this.allCsvFilesDetail).forEach(([file, lines]) => {
      if (file !== 'yearlyModified.csv') {
        for (const line of lines) {
          const [date, account, , debit, credit] = line.split(',');
          if (account === 'Cash') {
            const year = new Date(date).getFullYear();
            if (!cashByYear[year]) {
              cashByYear[year] = 0;
            }
            cashByYear[year] +=
              parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
          }
        }
      }
    });
    const output = ['Financial Year,Cash Balance'];
    Object.keys(cashByYear)
      .sort()
      .forEach((year) => {
        output.push(`${year},${cashByYear[year].toFixed(2)}`);
      });
    fs.writeFileSync(outputFile, output.join('\n'));
    this.states.yearlyModified = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  calculateGroupAccountResult(
    accounts: Array<string>,
    balances: Record<string, number>,
  ) {
    const output: string[] = [];
    let totalAssets = 0;

    for (const account of accounts) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalAssets += value;
    }
    return { output, totalAssets };
  }

  fs() {
    this.states.fs = 'starting';
    const start = performance.now();
    const tmpDir = 'tmp';
    const outputFile = 'out/fs.csv';
    const categories = {
      'Income Statement': {
        Revenues: ['Sales Revenue'],
        Expenses: [
          'Cost of Goods Sold',
          'Salaries Expense',
          'Rent Expense',
          'Utilities Expense',
          'Interest Expense',
          'Tax Expense',
        ],
      },
      'Balance Sheet': {
        Assets: [
          'Cash',
          'Accounts Receivable',
          'Inventory',
          'Fixed Assets',
          'Prepaid Expenses',
        ],
        Liabilities: [
          'Accounts Payable',
          'Loan Payable',
          'Sales Tax Payable',
          'Accrued Liabilities',
          'Unearned Revenue',
          'Dividends Payable',
        ],
        Equity: ['Common Stock', 'Retained Earnings'],
      },
    };
    const balances: Record<string, number> = {};
    for (const section of Object.values(categories)) {
      for (const group of Object.values(section)) {
        for (const account of group) {
          balances[account] = 0;
        }
      }
    }
    fs.readdirSync(tmpDir).forEach((file) => {
      if (file.endsWith('.csv') && file !== 'fs.csv') {
        const lines = fs
          .readFileSync(path.join(tmpDir, file), 'utf-8')
          .trim()
          .split('\n');

        for (const line of lines) {
          const [, account, , debit, credit] = line.split(',');

          if (balances.hasOwnProperty(account)) {
            balances[account] +=
              parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
          }
        }
      }
    });

    const output: string[] = [];
    output.push('Basic Financial Statement');
    output.push('');
    output.push('Income Statement');
    let totalRevenue = 0;
    let totalExpenses = 0;
    for (const account of categories['Income Statement']['Revenues']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalRevenue += value;
    }
    for (const account of categories['Income Statement']['Expenses']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalExpenses += value;
    }
    output.push(`Net Income,${(totalRevenue - totalExpenses).toFixed(2)}`);
    output.push('');
    output.push('Balance Sheet');
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    output.push('Assets');
    for (const account of categories['Balance Sheet']['Assets']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalAssets += value;
    }
    output.push(`Total Assets,${totalAssets.toFixed(2)}`);
    output.push('');
    output.push('Liabilities');
    for (const account of categories['Balance Sheet']['Liabilities']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalLiabilities += value;
    }
    output.push(`Total Liabilities,${totalLiabilities.toFixed(2)}`);
    output.push('');
    output.push('Equity');
    for (const account of categories['Balance Sheet']['Equity']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalEquity += value;
    }
    output.push(
      `Retained Earnings (Net Income),${(totalRevenue - totalExpenses).toFixed(2)}`,
    );
    totalEquity += totalRevenue - totalExpenses;
    output.push(`Total Equity,${totalEquity.toFixed(2)}`);
    output.push('');
    output.push(
      `Assets = Liabilities + Equity, ${totalAssets.toFixed(2)} = ${(totalLiabilities + totalEquity).toFixed(2)}`,
    );
    fs.writeFileSync(outputFile, output.join('\n'));
    this.states.fs = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  fsModified() {
    this.states.fsModified = 'starting';
    const start = performance.now();
    const outputFile = 'out/fsModified.csv';

    const categories = {
      'Income Statement': {
        Revenues: ['Sales Revenue'],
        Expenses: [
          'Cost of Goods Sold',
          'Salaries Expense',
          'Rent Expense',
          'Utilities Expense',
          'Interest Expense',
          'Tax Expense',
        ],
      },
      'Balance Sheet': {
        Assets: [
          'Cash',
          'Accounts Receivable',
          'Inventory',
          'Fixed Assets',
          'Prepaid Expenses',
        ],
        Liabilities: [
          'Accounts Payable',
          'Loan Payable',
          'Sales Tax Payable',
          'Accrued Liabilities',
          'Unearned Revenue',
          'Dividends Payable',
        ],
        Equity: ['Common Stock', 'Retained Earnings'],
      },
    };
    const balances: Record<string, number> = {};
    for (const section of Object.values(categories)) {
      for (const group of Object.values(section)) {
        for (const account of group) {
          balances[account] = 0;
        }
      }
    }
    Object.entries(this.allCsvFilesDetail).forEach(([file, lines]) => {
      if (file !== 'fs.csv') {
        for (const line of lines) {
          const [, account, , debit, credit] = line.split(',');

          if (balances.hasOwnProperty(account)) {
            balances[account] +=
              parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
          }
        }
      }
    });

    const output: string[] = ['Basic Financial Statement', ''];

    output.push('Income Statement');
    const { output: revenueOutput, totalAssets: totalRevenue } =
      this.calculateGroupAccountResult(
        categories['Income Statement']['Revenues'],
        balances,
      );
    output.push(...revenueOutput);
    const { output: expenseOutput, totalAssets: totalExpenses } =
      this.calculateGroupAccountResult(
        categories['Income Statement']['Expenses'],
        balances,
      );
    output.push(...expenseOutput);
    output.push(`Net Income,${(totalRevenue - totalExpenses).toFixed(2)}`);
    output.push('');

    output.push('Balance Sheet');
    output.push('Assets');
    const { output: assetOutput, totalAssets } =
      this.calculateGroupAccountResult(
        categories['Balance Sheet']['Assets'],
        balances,
      );
    output.push(...assetOutput);
    output.push(`Total Assets,${totalAssets.toFixed(2)}`);
    output.push('');

    output.push('Liabilities');
    const { output: liabilityOutput, totalAssets: totalLiabilities } =
      this.calculateGroupAccountResult(
        categories['Balance Sheet']['Liabilities'],
        balances,
      );
    output.push(...liabilityOutput);
    output.push(`Total Liabilities,${totalLiabilities.toFixed(2)}`);
    output.push('');

    output.push('Equity');
    const { output: equityOutput, totalAssets: subtotalEquity } =
      this.calculateGroupAccountResult(
        categories['Balance Sheet']['Equity'],
        balances,
      );
    output.push(...equityOutput);
    let totalEquity = subtotalEquity;
    output.push(
      `Retained Earnings (Net Income),${(totalRevenue - totalExpenses).toFixed(2)}`,
    );
    totalEquity += totalRevenue - totalExpenses;
    output.push(`Total Equity,${totalEquity.toFixed(2)}`);
    output.push('');

    output.push(
      `Assets = Liabilities + Equity, ${totalAssets.toFixed(2)} = ${(totalLiabilities + totalEquity).toFixed(2)}`,
    );
    fs.writeFileSync(outputFile, output.join('\n'));
    this.states.fsModified = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }
}
