import { FINANCE_LEDGER_ENDPOINTS as E } from './endpoints';
import { toPaginated, unwrapData, type FinanceHttp } from './http';
import type { DataEnvelope, Paginated } from '../domain/common';
import type {
  Statement,
  StatementIssueChecks,
  StatementLine,
} from '../domain/statements';
import type { StatementsApi } from './types';

export const createStatementsApi = (http: FinanceHttp): StatementsApi => ({
  async listStatements(query, options) {
    return toPaginated(
      await http.get<Paginated<Statement>>(E.statements(query), options),
    );
  },

  async getStatement(id, options) {
    return unwrapData(await http.get<DataEnvelope<Statement>>(E.statement(id), options));
  },

  async listStatementLines(id, query, options) {
    return toPaginated(
      await http.get<Paginated<StatementLine>>(E.statementLines(id, query), options),
    );
  },

  async getStatementIssueChecks(id, options) {
    return unwrapData(
      await http.get<DataEnvelope<StatementIssueChecks>>(
        E.statementIssueChecks(id),
        options,
      ),
    );
  },

  async issueStatement(id, input, options) {
    return unwrapData(
      await http.send<DataEnvelope<Statement>>('PUT', E.issueStatement(id), input, options),
    );
  },

  async writeOffStatement(id, input, options) {
    return unwrapData(
      await http.send<DataEnvelope<Statement>>(
        'PUT',
        E.writeOffStatement(id),
        input,
        options,
      ),
    );
  },
});
