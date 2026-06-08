// routes/workouts.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/workoutController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/',       verifyToken, ctrl.getWorkouts);
router.post('/',      verifyToken, isAdmin, ctrl.assignWorkout);
router.put('/:id',    verifyToken, isAdmin, ctrl.updateWorkout);
router.delete('/:id', verifyToken, isAdmin, ctrl.deleteWorkout);

module.exports = router;
