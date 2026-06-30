import { pool } from "../../db";
import { USER_ROLE } from "../../types";
import type { IIssue } from "./issue.interface";

const createIssueInDB = async (payload: IIssue, reporter_id: number) => {
  const { title, description, type } = payload;

  const result = await pool.query(
    `
    INSERT INTO issues (
      title,
      description,
      type,
      reporter_id
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *;
    `,
    [title, description, type, reporter_id]
  );

  return result.rows[0];
};

const getAllIssuesFromDB = async (query: any) => {
  const { sort = "newest", type, status } = query;

  let sql = `
    SELECT *
    FROM issues
    WHERE 1=1
  `;

  const values: any[] = [];
  let count = 1;

  if (type) {
    sql += ` AND type = $${count}`;
    values.push(type);
    count++;
  }

  if (status) {
    sql += ` AND status = $${count}`;
    values.push(status);
    count++;
  }

  sql += `
    ORDER BY created_at ${sort === "oldest" ? "ASC" : "DESC"}
  `;

  const issueResult = await pool.query(sql, values);

  const issues = issueResult.rows;

  if (!issues.length) {
    return [];
  }

  // Get all reporter ids
  const reporterIds = [...new Set(issues.map((issue) => issue.reporter_id))];

  // Fetch reporters in one query
  const reporterResult = await pool.query(
    `
    SELECT id, name, role
    FROM users
    WHERE id = ANY($1)
    `,
    [reporterIds]
  );

  const reporterMap = new Map();

  reporterResult.rows.forEach((user) => {
    reporterMap.set(user.id, user);
  });

  const formattedIssues = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter: reporterMap.get(issue.reporter_id) || null,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  }));

  return formattedIssues;
};

const getSingleIssueFromDB = async (issueId: number) => {
  const issueResult = await pool.query(
    `
    SELECT *
    FROM issues
    WHERE id = $1
    `,
    [issueId]
  );

  const issue = issueResult.rows[0];

  if (!issue) {
    return null;
  }

  const reporterResult = await pool.query(
    `
    SELECT id, name, role
    FROM users
    WHERE id = $1
    `,
    [issue.reporter_id]
  );

  const reporter = reporterResult.rows[0];

  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
};

const updateIssueInDB = async (
  issueId: number,
  payload: {
    title?: string;
    description?: string;
    type?: string;
  },
  user: any
) => {
  const issueResult = await pool.query(
    `
    SELECT *
    FROM issues
    WHERE id = $1
    `,
    [issueId]
  );

  const issue = issueResult.rows[0];

  if (!issue) {
    throw {
      statusCode: 404,
      message: "Issue not found",
    };
  }

  // Maintainer can update any issue
  if (user.role !== USER_ROLE.maintainer) {
    // Must be owner
    if (issue.reporter_id !== user.id) {
      throw {
        statusCode: 403,
        message: "You are not allowed to update this issue",
      };
    }

    // Only open issues
    if (issue.status !== "open") {
      throw {
        statusCode: 403,
        message: "You can only update your issue while status is open",
      };
    }
  }

  const { title, description, type } = payload;

  const updatedResult = await pool.query(
    `
    UPDATE issues
    SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      type = COALESCE($3, type),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *;
    `,
    [title, description, type, issueId]
  );

  return updatedResult.rows[0];
};

const deleteIssueFromDB = async (issueId: number) => {
  const issueResult = await pool.query(
    `
    SELECT id
    FROM issues
    WHERE id = $1
    `,
    [issueId]
  );

  if (issueResult.rows.length === 0) {
    throw {
      statusCode: 404,
      message: "Issue not found",
    };
  }

  await pool.query(
    `
    DELETE FROM issues
    WHERE id = $1
    `,
    [issueId]
  );
};

export const issueService = {
  createIssueInDB,
  getAllIssuesFromDB,
  getSingleIssueFromDB,
  updateIssueInDB,
  deleteIssueFromDB,
};
