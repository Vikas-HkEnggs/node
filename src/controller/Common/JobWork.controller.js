import dayjs from "dayjs";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Op } from "sequelize";
import { ApiError } from "../../utils/ApiError.js";
import JobWork from "../../models/JobWork/JobWorks.model.js";
import JobWorkItems from "../../models/JobWork/JobWorkItems.model.js";
import VendorsForJobWork from "../../models/JobWork/VendorsForJobWork.model.js";
// import { JobWorkItems, VendorsForJobWork } from "../../models/index.js";

//<<<<<<<<<<============ JOB WORK CONTROLLERS ==========>>>>>>>>>>>

// Add New Job Item
export const addJobItem = asyncHandler(async (req, res) => {
  const { jobItem } = req.body;

  if (!jobItem) {
   return res.status(400).json(new ApiResponse(400, null, "Job Item is required"));
  }

  try {

    const existingJobItem = await JobWorkItems.findOne({
      where: {
        item: jobItem.toUpperCase(),
      },
    });

    if (existingJobItem) {
     return res.status(400).json(new ApiResponse(400, null, "Job Item already exists"));
    }

    // Create a new job item record
    const newJobItem = await JobWorkItems.create({
      item: jobItem,
    }); 

    res.status(201).json(new ApiResponse(201, newJobItem, "Job Item added successfully"));
  } catch (error) {
    console.error("Error adding Job Item:", error);
    throw new ApiError(500, "Failed to add Job Item", error);
  }
});

// Fetch all job items
export const getJobItems = asyncHandler(async (req, res) => {
  try {
    const jobItems = await JobWorkItems.findAll();
    res.status(200).json(new ApiResponse(200, jobItems, "Fetched all job items"));
  } catch (error) {
    console.error("Error fetching job items:", error);
   throw new ApiError(500, "Failed to fetch job items", error);
  }
});

// Create Job Work
export const createJobWork = asyncHandler(async (req, res) => {
  const {
    vendorName,
    vendorEmail,
    gstNumber,
    address,
    items,
    challanNumber,
    commitmentDate,
    remarks
  } = req.body;

  try {
    const createdBy = req.user?.id;
    const file = req.file;

    const challanFile = file?.path || null;

    const existingJobWorkByChallanNumber = await JobWork.findOne({
      where: {
        challanNumber: parseInt(challanNumber),
      },
    });

    if (existingJobWorkByChallanNumber) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Challan number already exists. Please use a different one."
          )
        );
    }

    const jobWork = await JobWork.create({
      vendorName,
      vendorEmail: vendorEmail || null,
      gstNumber,
      address,
      items,
      challanNumber: parseInt(challanNumber) || null,
      remarks: remarks || null,
      challanFile,
      commitmentDate,
      createdBy,
    });

    res
      .status(201)
      .json(new ApiResponse(201, jobWork, "Job Work created successfully"));
  } catch (error) {
    console.error("Error creating job work:", error);
    throw new ApiError(500, "Failed to create job work", error);
  }
});

// Get All Job Work
export const getAllJobWork = asyncHandler(async (req, res) => {
  try {
    const jobWorks = await JobWork.findAll();

    const filteredJobWorks = jobWorks
      .filter((jobWork) => !jobWork.isDeleted)
      .reverse();

    const deletedJobWorks = jobWorks
      .filter((jobWork) => jobWork.isDeleted)
      .reverse();

    const pendingJobWorks = filteredJobWorks.filter(
      (jobWork) => jobWork.status === "Pending"
    );

    const cancelledJobWorks = filteredJobWorks.filter(
      (jobWork) => jobWork.status === "Cancelled"
    );

    const completedJobWorks = filteredJobWorks.filter(
      (jobWork) => jobWork.status === "Completed"
    );

    const jobWorksByDate = filteredJobWorks.reduce((acc, jobWork) => {
      const date = jobWork.createdAt.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(jobWork);
      return acc;
    }, {});

    const jobWorkByVendor = filteredJobWorks.reduce((acc, jobWork) => {
      let jobWorkByVendorName = jobWork.vendorName;

      if (!acc[jobWorkByVendorName]) {
        acc[jobWorkByVendorName] = [];
      }
      acc[jobWorkByVendorName].push(jobWork);

      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: "jobWorks fetched successfully",
      data: {
        allJobWorks: filteredJobWorks,
        jobWorksByDate,
        pendingJobWorks,
        completedJobWorks,
        jobWorkByVendor,
        cancelledJobWorks,
        deletedJobWorks,
      },
    });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Update Job Work
export const updateJobWork = asyncHandler(async (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  const { receivedQuantity, receivingDate, itemId } = req.body;

  try {
    const jobWork = await JobWork.findByPk(jobId);

    if (!jobWork) {
      throw new ApiError(404, "Job Work not found");
    }

    const parsedItemsData = JSON.parse(jobWork.items);

    parsedItemsData.filter((item) => {
      if (item?.id === itemId) {
        item?.received?.push({
          receivedQuantity,
          receivingDate,
        });
      }
    });

    jobWork.items = JSON.stringify(parsedItemsData);

    const result = parsedItemsData.every((item) => {
      const totalReceived = item?.received?.reduce((acc, curr) => {
        const qty = parseInt(curr?.receivedQuantity, 10) || 0;
        const total = acc + qty;
        return total;
      }, 0);

      if (totalReceived === parseInt(item?.totalQuantity)) {
        return true;
      }
    });

    if (result) {
      jobWork.status = "Completed";
    }

    jobWork.lastReceivedDate = receivingDate;

    await jobWork.save();

    res
      .status(200)
      .json(new ApiResponse(200, jobWork, "Job Work updated successfully"));
  } catch (error) {
    console.error("Error updating job work:", error);
    throw new ApiError(500, "Failed to update job work", error);
  }
});

// Soft Delete Job Work
export const softDeleteJobWork = asyncHandler(async (req, res) => {
  const jobId = parseInt(req.params.id, 10);

  try {
    const jobWork = await JobWork.findByPk(jobId);

    if (!jobWork) {
      throw new ApiError(404, "Job Work not found");
    }

    jobWork.isDeleted === true
      ? (jobWork.isDeleted = false)
      : (jobWork.isDeleted = true);

    await jobWork.save();

    res
      .status(200)
      .json(new ApiResponse(200, jobWork, "Job Work deleted successfully"));
  } catch (error) {
    console.error("Error deleting job work:", error);
    throw new ApiError(500, "Failed to delete job work", error);
  }
});

// Soft Delete by Selection
export const softDeleteJobBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const jobWorks = await JobWork.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!jobWorks) {
      throw new ApiError(404, "Job Work not found");
    }

    for (const jobWork of jobWorks) {
      jobWork.isDeleted = true;
      await jobWork.save();
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, jobWorks, "Selected Job Work deleted successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Restore by Selection
export const restoreJobBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const jobWorks = await JobWork.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!jobWorks) {
      throw new ApiError(404, "Job Work not found");
    }

    for (const jobWork of jobWorks) {
      jobWork.isDeleted = false;
      await jobWork.save();
    }
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          jobWorks,
          "Selected Job Work restored successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Permanently Delete Job Work
export const deleteJobWork = asyncHandler(async (req, res) => {
  const jobId = parseInt(req.params.id, 10);

  try {
    const jobWork = await JobWork.findByPk(jobId);

    if (!jobWork) {
      throw new ApiError(404, "Job Work not found");
    }

    await jobWork.destroy();

    res
      .status(200)
      .json(new ApiResponse(200, jobWork, "Job Work deleted successfully"));
  } catch (error) {
    console.error("Error deleting job work:", error);
    throw new ApiError(500, "Failed to delete job work", error);
  }
});

// Permanently delete by Selection
export const deleteJobBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const jobWorks = await JobWork.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!jobWorks) {
      throw new ApiError(404, "Job Works not found");
    }

    for (const jobWork of jobWorks) {
      await jobWork.destroy();
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, jobWorks, "Selected Job Work deleted successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

export const updateJobWorkStatus = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  try {
    const jobWork = await JobWork.findByPk(id);

    if (!jobWork) {
      throw new ApiError(404, "Job Work not found");
    }

    jobWork.status = status;
    await jobWork.save();

    res
      .status(200)
      .json(new ApiResponse(200, jobWork, "Job Work updated successfully"));
  } catch (error) {
    console.error("Error updating job work:", error);
    throw new ApiError(500, "Failed to update job work", error);
  }
});

// Notify Job Work
export const notifyJobWorkWhenCommitmentDateNear = asyncHandler(
  async (req, res) => {
    // Define the range: today at 00:00:00 to two days from now at 23:59:59
    const today = dayjs().startOf("day");
    const twoDaysFromNow = dayjs().add(2, "days").endOf("day");

    // Query database for jobs with commitmentDate in this range
    const jobWork = await JobWork.findAll({
      where: {
        commitmentDate: {
          [Op.between]: [today.toDate(), twoDaysFromNow.toDate()],
        },
      },
    });

    if (jobWork.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No job work found"));
    }

    // Simulate sending notifications
    // for (const job of jobWork) {
    //   console.log("Sending notification for job work:", job);
    // }

    res
      .status(200)
      .json(new ApiResponse(200, jobWork, "Notifications sent successfully"));
  }
);

//<<<<<<<<<<============ VENDORS CONTROLLERS ==========>>>>>>>>>>>

// Add new vendor details
export const addNewVendor = asyncHandler(async (req, res) => {
  try {
    const { vendorName, address, gstin, email } = req.body;

    // Create a new vendor record
    const newVendor = await VendorsForJobWork.create({
      vendorName,
      address,
      gstin,
      email,
    });

    res.status(201).json({
      message: "Vendor for Job Work added successfully!",
      data: newVendor,
    });
  } catch (error) {
    console.error("Error adding vendor:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Fetch all vendors details
export const getAllVendors = asyncHandler(async (req, res) => {
  try {
    const vendorsDetails = await VendorsForJobWork.findAll({
      attributes: ["id", "vendorName", "address", "gstNumber", "vendorEmail"],
      group: ["id"],
    });

    res.status(200).json({
      message: "Fetched all Vendors details successfully!",
      data: vendorsDetails,
    });
  } catch (error) {
    console.error("Error fetching Vendors details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});
