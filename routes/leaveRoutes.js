const express = require('express');
const router = express.Router();
const Leave = require('../models/leave');
const { sendApiResponse } = require('../utils/helperFunction');

// Add a leave for a partner
router.post('/add', async (req, res) => {

  let { partnerId, startDate, endDate, leaveSlots } = req.body;
  console.log("req.body==>", req.body);

  // Default leaveSlots if empty
  if (!leaveSlots || leaveSlots.length === 0) {
    leaveSlots = [
      '6:00 - 7:00',
      '7:00 - 8:00',
      '8:00 - 9:00',
      '9:00 - 10:00',
      '10:00 - 11:00',
      '11:00 - 12:00',
      '12:00 - 13:00',
      '13:00 - 14:00',
      '14:00 - 15:00',
      '15:00 - 16:00',
      '16:00 - 17:00',
      '17:00 - 18:00',
      '18:00 - 19:00',
      '19:00 - 20:00',
      '20:00 - 21:00',
      '21:00 - 22:00',
    ];
  }

  // Convert startDate and endDate to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Validate Date Conversion
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return sendApiResponse(res, 204, null, 'Invalid date format', 'Request failed');
  }

  // Function to convert time slot string to minutes from start of the day
  const parseTimeSlot = (slot) => {
    const [startTimeStr, endTimeStr] = slot.split(' - ');
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);

    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    if (isNaN(startTimeMinutes) || isNaN(endTimeMinutes)) {
      throw new Error('Invalid time slot format');
    }

    return {
      startTimeMinutes,
      endTimeMinutes
    };
  };

  // Format leaveSlots to minutes
  const formattedLeaveSlots = leaveSlots.map(slot => parseTimeSlot(slot));

  // Check for clashes in leave dates and slots
  try {
    const clash = await Leave.findOne({
      partnerId,
      $and: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
        {
          $expr: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$leaveSlots",
                    as: "slot",
                    cond: {
                      $and: [
                        { $lte: [ "$$slot.startTimeMinutes", formattedLeaveSlots[0].endTimeMinutes ] },
                        { $gte: [ "$$slot.endTimeMinutes", formattedLeaveSlots[0].startTimeMinutes ] }
                      ]
                    }
                  }
                }
              },
              0
            ]
          }
        }
      ]
    });

    console.log("clash===>",clash)
    if (clash) {
      return sendApiResponse(res, 400, null, 'Leave dates or time slots clash', 'Request failed');
    }

    const newLeave = new Leave({
      partnerId,
      startDate: start,
      endDate: end,
      leaveSlots: formattedLeaveSlots,
      status :'PENDING'
    });

    await newLeave.save();
    sendApiResponse(res, 201, { leave: newLeave }, null, 'Leave added successfully');
  } catch (err) {
    console.error("Error saving leave:", err);
    sendApiResponse(res, 500, null, 'Internal server error', 'Request failed');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const leaves = await Leave.find({_id:req.params.id});
    sendApiResponse(res, 200, { leaves }, null, 'Leaves retrieved successfully');
  } catch (err) {
    console.error("Error retrieving leaves:", err);
    sendApiResponse(res, 500, null, 'Internal server error', 'Request failed');
  }
});

// Edit leave (Approve/Deny)
router.put('/:id', async (req, res) => {
  const { status } = req.body;
  console.log("status===>",status)
  try {
    const updatedLeave = await Leave.findByIdAndUpdate(req.params.id, { status }, { new: true });
    sendApiResponse(res, 200, { leave: updatedLeave }, null, 'Leave updated successfully');
  } catch (err) {
    console.error("Error updating leave:", err);
    sendApiResponse(res, 500, null, 'Internal server error', 'Request failed');
  }
});

module.exports = router;
