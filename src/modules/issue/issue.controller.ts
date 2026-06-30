import type { Request, Response } from "express";
import { issueService } from "./issue.service";

const createIssue = async (req: Request, res: Response) => {
  try {
    const reporter_id = req?.user?.id;

    const result = await issueService.createIssueInDB(req.body, reporter_id);

    res.status(201).json({
      success: true,
      message: "Issue created successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getAllIssues = async (req: Request, res: Response) => {
  try {
    const result = await issueService.getAllIssuesFromDB(req.query);

    res.status(200).json({
      success: true,
      message: "Issues retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getSingleIssue = async (req: Request, res: Response) => {
  try {
    const issueId = Number(req.params.id);

    const result = await issueService.getSingleIssueFromDB(issueId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Issue retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const updateIssue = async (req: Request, res: Response) => {
  try {
    const issueId = Number(req.params.id);

    const user = req.user;

    const result = await issueService.updateIssueInDB(issueId, req.body, user);

    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      data: result,
    });
  } catch (error: any) {
    console.error(error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

const deleteIssue = async (req: Request, res: Response) => {
  try {
    const issueId = Number(req.params.id);

    await issueService.deleteIssueFromDB(issueId);

    res.status(200).json({
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error: any) {
    console.error(error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const issueController = {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
  deleteIssue,
};
