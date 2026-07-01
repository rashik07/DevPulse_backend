

   import { createRequire } from 'module';

   const require = createRequire(import.meta.url);

  

// src/app.ts
import CookieParser from "cookie-parser";
import cors from "cors";
import express2 from "express";

// src/middleware/logger.ts
import fs from "fs";
var logger = (req, res, next) => {
  console.log("Method - URL - Time:", req.method, req.url, Date.now());
  const log = `
Method -> ${req.method} - Time -> ${Date.now()} - URL -> ${req.url}
`;
  fs.appendFile("logger.txt", log, (err) => {
  });
  next();
};
var logger_default = logger;

// src/middleware/globalErrorHandler.ts
var globalErrorHandler = (err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
};
var globalErrorHandler_default = globalErrorHandler;

// src/modules/auth/auth.route.ts
import { Router } from "express";

// src/utility/sendResponse.ts
var sendResponse = (res, data) => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    data: data.data,
    errors: data.errors
  });
};
var sendResponse_default = sendResponse;

// src/db/index.ts
import { Pool } from "pg";

// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var config = {
  connection_string: process.env.CONNECTIONSTRING,
  port: process.env.PORT,
  secret: process.env.JWT_SECRET,
  refresh_secret: process.env.JWT_REFRESH_SECRET
};
var config_default = config;

// src/db/index.ts
var pool = new Pool({
  connectionString: config_default.connection_string
});
var initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,

        role VARCHAR(50) NOT NULL DEFAULT 'contributor'
          CHECK (role IN ('contributor', 'maintainer')),

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id SERIAL PRIMARY KEY,

        title VARCHAR(150) NOT NULL,

        description TEXT NOT NULL
          CHECK (LENGTH(description) >= 20),

        type VARCHAR(20) NOT NULL
          CHECK (type IN ('bug', 'feature_request')),

        status VARCHAR(20) NOT NULL DEFAULT 'open'
          CHECK (status IN ('open', 'in_progress', 'resolved')),

        reporter_id INT NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};

// src/modules/auth/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var createUserIntoDB = async (payload) => {
  const { name, email, password, role } = payload;
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `
    INSERT INTO users (name, email, password, role)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `,
    [name, email, hashedPassword, role || "contributor"]
  );
  delete result.rows[0].password;
  return result;
};
var loginUser = async (email, password) => {
  const result = await pool.query(
    `
    SELECT * FROM users WHERE email = $1
  `,
    [email]
  );
  if (result.rows.length === 0) {
    throw new Error("User not found");
  }
  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }
  const jwtpayload = {
    id: user.id,
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    email: user.email
  };
  const accessToken = jwt.sign(jwtpayload, config_default.secret, {
    expiresIn: "1d"
  });
  return { accessToken, user };
};
var authService = {
  createUserIntoDB,
  loginUser
};

// src/modules/auth/auth.controller.ts
var createUser = async (req, res) => {
  try {
    const result = await authService.createUserIntoDB(req.body);
    sendResponse_default(res, {
      statusCode: 201,
      success: true,
      message: "User registered successfully",
      data: result.rows[0]
    });
  } catch (error) {
    sendResponse_default(res, {
      statusCode: 500,
      success: false,
      message: error.message,
      errors: error
    });
  }
};
var loginUser2 = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    const result = await authService.loginUser(email, password);
    console.log(result);
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Login successful",
      data: result
    });
  } catch (error) {
    sendResponse_default(res, {
      statusCode: 500,
      success: false,
      message: error.message,
      errors: error
    });
  }
};
var authController = {
  createUser,
  loginUser: loginUser2
};

// src/modules/auth/auth.route.ts
var router = Router();
router.post("/signup", authController.createUser);
router.post("/login", authController.loginUser);
var authRoute = router;

// src/modules/issue/issue.router.ts
import express from "express";

// src/types/index.ts
var USER_ROLE = {
  contributor: "contributor",
  maintainer: "maintainer"
};

// src/modules/issue/issue.service.ts
var createIssueInDB = async (payload, reporter_id) => {
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
var getAllIssuesFromDB = async (query) => {
  const { sort = "newest", type, status } = query;
  let sql = `
    SELECT *
    FROM issues
    WHERE 1=1
  `;
  const values = [];
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
  const reporterIds = [...new Set(issues.map((issue) => issue.reporter_id))];
  const reporterResult = await pool.query(
    `
    SELECT id, name, role
    FROM users
    WHERE id = ANY($1)
    `,
    [reporterIds]
  );
  const reporterMap = /* @__PURE__ */ new Map();
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
    updated_at: issue.updated_at
  }));
  return formattedIssues;
};
var getSingleIssueFromDB = async (issueId) => {
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
    updated_at: issue.updated_at
  };
};
var updateIssueInDB = async (issueId, payload, user) => {
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
      message: "Issue not found"
    };
  }
  if (user.role !== USER_ROLE.maintainer) {
    if (issue.reporter_id !== user.id) {
      throw {
        statusCode: 403,
        message: "You are not allowed to update this issue"
      };
    }
    if (issue.status !== "open") {
      throw {
        statusCode: 403,
        message: "You can only update your issue while status is open"
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
var deleteIssueFromDB = async (issueId) => {
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
      message: "Issue not found"
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
var issueService = {
  createIssueInDB,
  getAllIssuesFromDB,
  getSingleIssueFromDB,
  updateIssueInDB,
  deleteIssueFromDB
};

// src/modules/issue/issue.controller.ts
var createIssue = async (req, res) => {
  try {
    const reporter_id = req?.user?.id;
    const result = await issueService.createIssueInDB(req.body, reporter_id);
    res.status(201).json({
      success: true,
      message: "Issue created successfully",
      data: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};
var getAllIssues = async (req, res) => {
  try {
    const result = await issueService.getAllIssuesFromDB(req.query);
    res.status(200).json({
      success: true,
      message: "Issues retrieved successfully",
      data: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};
var getSingleIssue = async (req, res) => {
  try {
    const issueId = Number(req.params.id);
    const result = await issueService.getSingleIssueFromDB(issueId);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Issue not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Issue retrieved successfully",
      data: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};
var updateIssue = async (req, res) => {
  try {
    const issueId = Number(req.params.id);
    const user = req.user;
    const result = await issueService.updateIssueInDB(issueId, req.body, user);
    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      data: result
    });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Something went wrong"
    });
  }
};
var deleteIssue = async (req, res) => {
  try {
    const issueId = Number(req.params.id);
    await issueService.deleteIssueFromDB(issueId);
    res.status(200).json({
      success: true,
      message: "Issue deleted successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Something went wrong"
    });
  }
};
var issueController = {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
  deleteIssue
};

// src/middleware/auth.ts
import jwt2 from "jsonwebtoken";
var auth = (...roles) => {
  return async (req, res, next) => {
    console.log(roles);
    try {
      const token = req.headers.authorization;
      console.log(token);
      if (!token) {
        res.status(401).json({
          success: false,
          message: "Unauthorized access!!"
        });
      }
      const decoded = jwt2.verify(
        token,
        config_default.secret
      );
      const userData = await pool.query(
        `
     SELECT * FROM users WHERE email=$1   
        `,
        [decoded.email]
      );
      const user = userData.rows[0];
      if (userData.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "User not found!"
        });
      }
      if (roles.length && !roles.includes(user.role)) {
        res.status(403).json({
          success: false,
          message: "Forbidden!!,This role have no access!"
        });
      }
      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};
var auth_default = auth;

// src/modules/issue/issue.router.ts
var router2 = express.Router();
router2.post(
  "/",
  auth_default(USER_ROLE.contributor, USER_ROLE.maintainer),
  issueController.createIssue
);
router2.get("/", issueController.getAllIssues);
router2.get("/:id", issueController.getSingleIssue);
router2.patch(
  "/:id",
  auth_default(USER_ROLE.contributor, USER_ROLE.maintainer),
  issueController.updateIssue
);
router2.delete("/:id", auth_default(USER_ROLE.maintainer), issueController.deleteIssue);
var issueRoutes = router2;

// src/app.ts
var app = express2();
app.use(CookieParser());
app.use(express2.json());
app.use(express2.text());
app.use(express2.urlencoded({ extended: true }));
app.use(logger_default);
app.use(
  cors({
    origin: "http://localhost:3000"
  })
);
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Express Server",
    author: "Next Level"
  });
});
app.use("/api/auth", authRoute);
app.use("/api/issues", issueRoutes);
app.use(globalErrorHandler_default);
var app_default = app;

// src/server.ts
var main = () => {
  initDB();
  app_default.listen(config_default.port, () => {
    console.log(`Example app listening on port ${config_default.port}`);
  });
};
main();
//# sourceMappingURL=server.js.map