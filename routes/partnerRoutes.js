const express = require('express');
const router = express.Router();
const Partner = require('../models/partner');
const Leaves = require('../models/leave');
const { sendApiResponse } = require('../utils/helperFunction');

const moment = require('moment'); // Ensure moment is installed

// Get all partners' leaves
router.get('/leaves', async (req, res) => {
  try {
    const partners = await Leaves.aggregate([
      {
        $lookup: {
          from: 'partners',
          localField: 'partnerId',
          foreignField: '_id',
          as: 'partnerDetails'
        }
      },
      {
        $unwind: {
          path: '$partnerDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          leaveId: '$_id',
          partnerName: { $ifNull: ['$partnerDetails.name', 'N/A'] },
          partnerCity: { $ifNull: ['$partnerDetails.city', 'N/A'] },
          partnerState: { $ifNull: ['$partnerDetails.state', 'N/A'] },
          startDate: '$startDate',
          endDate: '$endDate',
          leaveSlots: '$leaveSlots',
          status: '$status',
          createdAt: '$createdAt'
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    sendApiResponse(res, 200, { partners }, null, 'Partners retrieved successfully');
  } catch (err) {
    console.error("Error retrieving leaves:", err);
    sendApiResponse(res, 500, null, 'Internal server error', 'Request failed');
  }
});

// Get all partners
router.get('/', async (req, res) => {
  try {
    const partners = await Partner.find();
    sendApiResponse(res, 200, { partners }, null, 'Partners retrieved successfully');
  } catch (err) {
    console.error("Error retrieving partners:", err);
    sendApiResponse(res, 500, null, 'Internal server error', 'Request failed');
  }
});



router.post('/schedule', async (req, res) => {
  const { id, day } = req.body;
  console.log('Request Body:', req.body);


  try {
    const dayOfWeek = moment(day).format('dddd');
    console.log('Day of Week:', dayOfWeek);

    const partner = await Partner.findOne(
      { _id: id, "schedule.day": dayOfWeek },
      { "schedule.$": 1 }
    );
    console.log('Partner Data:', partner);

    if (!partner) {
      return sendApiResponse(res, 404, null, 'Partner not found', 'Request failed');
    }

    const workingHours = partner?.schedule[0]?.workingHours[0];
    console.log('Working Hours:', workingHours);

    const schedule = getdd(workingHours?.startTime, workingHours?.endTime);
    console.log('Schedule:', schedule);

    const startOfDay = new Date(day);
    startOfDay.setUTCHours(0, 0, 0, 0); // Start of the day

    const endOfDay = new Date(day);
    endOfDay.setUTCHours(23, 59, 59, 999); // End of the day

    const leaves = await Leaves.find({
      partnerId: id,
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },
      status : 'APPROVED'
    });
    
    console.log('Leaves:', JSON.stringify(leaves));

    const availableSchedule = filterLeaveSlots(schedule, leaves);
    console.log('Available Schedule:', availableSchedule);

    sendApiResponse(res, 200, { schedule: availableSchedule }, null, 'Schedule retrieved successfully');
  } catch (err) {
    console.error("Error retrieving schedule:", err);
    sendApiResponse(res, 500, null, 'Internal server error', 'Request failed');
  }
});

function filterLeaveSlots(schedule, leaves) {
  // Flatten all leave slots into a single array with startTimeMinutes and endTimeMinutes
  const leaveSlots = leaves.flatMap(leave => {
    console.log('Processing leave:', leave);
    return leave.leaveSlots.map(slot => {
      console.log('Leave Slot:', slot);
      return {
        startTimeMinutes: slot.startTimeMinutes,
        endTimeMinutes: slot.endTimeMinutes
      };
    });
  });

  function parseTimeSlotToMinutes(slot) {
    if (!slot) {
      console.error('Slot is undefined or null');
      return { startMinutes: 0, endMinutes: 0 };
    }
    const [start, end] = slot.split(' - ');
    if (!start || !end) {
      console.error('Invalid slot format:', slot);
      return { startMinutes: 0, endMinutes: 0 };
    }
    return {
      startMinutes: convertTimeToMinutes(start),
      endMinutes: convertTimeToMinutes(end),
    };
  }

  function convertTimeToMinutes(time) {
    if (!time) {
      console.error('Time is undefined or null');
      return 0;
    }
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      console.error('Invalid time format:', time);
      return 0;
    }
    return hours * 60 + minutes;
  }

  console.log('Leave Slots:', leaveSlots);

  // Filter the schedule to remove time slots that overlap with any leave slots
  return schedule.filter(slot => {
    const { startMinutes: slotStart, endMinutes: slotEnd } = parseTimeSlotToMinutes(slot);
    console.log('Checking slot:', slot, 'Start:', slotStart, 'End:', slotEnd);

    // Check if any leave slot overlaps with the current schedule slot
    return !leaveSlots.some(leaveSlot => {
      return (
        (leaveSlot.startTimeMinutes < slotEnd && leaveSlot.endTimeMinutes > slotStart) || // Overlaps
        (leaveSlot.startTimeMinutes >= slotStart && leaveSlot.startTimeMinutes < slotEnd) // Falls within the slot
      );
    });
  });
}

// Updated getdd function remains the same as before
function getdd(startTime, endTime) {
  console.log('Received startTime:', startTime, 'endTime:', endTime);

  const masterMap = {
    '6:00 - 7:00': '360-420',
    '7:00 - 8:00': '420-480',
    '8:00 - 9:00': '480-540',
    '9:00 - 10:00': '540-600',
    '10:00 - 11:00': '600-660',
    '11:00 - 12:00': '660-720',
    '12:00 - 13:00': '720-780',
    '13:00 - 14:00': '780-840',
    '14:00 - 15:00': '840-900',
    '15:00 - 16:00': '900-960',
    '16:00 - 17:00': '960-1020',
    '17:00 - 18:00': '1020-1080',
    '18:00 - 19:00': '1080-1140',
    '19:00 - 20:00': '1140-1200',
    '20:00 - 21:00': '1200-1260',
    '21:00 - 22:00': '1260-1320'
  };
  
  const timeSlots = Object.keys(masterMap);
  console.log('Available Time Slots:', timeSlots);

  function parseTimeRange(range) {
    const [start, end] = range.split('-').map(Number);
    return { startMinutes: start, endMinutes: end };
  }

  function isSlotAvailable(slot, startTime, endTime) {
    const { startMinutes: slotStart, endMinutes: slotEnd } = parseTimeRange(masterMap[slot]);
    return (startTime < slotEnd && endTime > slotStart);
  }

  const availableSlots = timeSlots.filter(slot => isSlotAvailable(slot, startTime, endTime));
  console.log('Available Slots:', availableSlots);

  return availableSlots;
}


module.exports = router;
