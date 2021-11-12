const express = require('express');
const mongoose = require('mongoose');
const Task = require(`../models/task`);
const auth = require(`../middleware/auth`);

const taskRouter = new express.Router();

taskRouter.post(`/tasks`, auth, async (req, res) => {
  try {
    const task = new Task({ ...req.body, owner: req.user._id });
    const newTask = await task.save();
    res.status(201).send(newTask);
  } catch (e) {
    if (e.name === `ValidationError`) {
      return res.status(400).send(e);
    }
    res.status(500).send(e);
  }
});

taskRouter.get(`/tasks`, auth, async (req, res) => {
  const { completed, limit, skip, sortBy } = req.query;
  const match = {};
  const sort = {};
  if (completed) {
    match.completed = completed === 'true';
  }
  if (sortBy) {
    const [field, direction] = sortBy.split(`:`);
    sort[field] = direction === 'desc' ? -1 : 1;
  }
  try {
    await req.user
      .populate({
        path: `tasks`,
        match,
        options: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          sort,
        },
      })
      .execPopulate();
    res.send(req.user.tasks);
  } catch (e) {
    res.status(500).send(e);
  }
});

taskRouter.get(`/tasks/:id`, auth, async (req, res) => {
  const _id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).send(`Wrong ID`);
  }
  try {
    const task = await Task.findOne({ _id, owner: req.user._id });
    if (!task) {
      return res.status(404).send();
    }
    res.send(task);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

taskRouter.patch(`/tasks/:id`, auth, async (req, res) => {
  const _id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).send({ error: `ID ${_id} is wrong, check it!` });
  }
  const allowedUpdates = [`describtion`, `completed`];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );
  if (!isValidOperation) {
    return res.status(400).send({ error: `invalid field to update` });
  }
  try {
    const task = await Task.findOne({ _id, owner: req.user._id });
    if (!task) {
      return res.status(404).send();
    }
    updates.forEach((update) => (task[update] = req.body[update]));
    await task.save();
    return res.send(task);
  } catch (e) {
    res.status(400).send(e);
  }
});

taskRouter.delete(`/tasks/:id`, auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!task) {
      return res.status(404).send();
    }
    await task.remove();
    res.send(task);
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});

module.exports = taskRouter;
