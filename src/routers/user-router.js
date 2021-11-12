const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const auth = require('../middleware/auth');
const User = require('../models/user');
const sharp = require('sharp');

const userRouter = new express.Router();

userRouter.post(`/users/login`, async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body);
    const token = await user.generateAuthToken();
    return res.send({ user, token });
  } catch (e) {
    res.status(400).send(e.message);
  }
});

userRouter.post(`/users/logout`, auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(
      (token) => token.token !== req.token
    );
    await req.user.save();
    return res.send();
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});

userRouter.post(`/users/logoutAll`, auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    return res.send();
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});

userRouter.post(`/users`, async (req, res) => {
  try {
    const user = new User(req.body);
    const newUser = await user.save();
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (e) {
    console.log(e);
    res.status(400).send(e);
  }
});

userRouter.get(`/users/me`, auth, async (req, res) => {
  res.send(req.user);
});

const upload = multer({
  limits: {
    fileSize: 1_000_000,
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      cb(new Error(`Check file extension! Should be one of: jpg, jpeg, png`));
    }
    cb(null, true);
  },
});

userRouter.post(
  `/users/me/photo`,
  auth,
  upload.single('avatar'),
  async (req, res) => {
    const image = await sharp(req.file.buffer);
    const buffer = await image.metadata().then((metadata) => {
      return image
        .resize(Math.round(metadata.width / 2))
        .png()
        .toBuffer();
    });

    req.user.photo = buffer;
    await req.user.save();
    res.send(req.user);
  },
  (err, req, res, next) => {
    res.send({ error: err.message });
  }
);

userRouter.get(
  `/users/:id/photo`,
  async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user || !user.photo) {
      return res.status(404).send();
    }
    res.set(`Content-Type`, `image/jpg`);
    res.send(user.photo);
  },
  (err, req, res, next) => {
    res.send({ error: err.message });
  }
);

userRouter.delete(
  `/users/me/photo`,
  auth,
  async (req, res) => {
    req.user.photo = undefined;
    await req.user.save();
    res.send(req.user);
  },
  (err, req, res, next) => {
    res.send({ error: err.message });
  }
);

userRouter.patch(`/users/me`, auth, async (req, res) => {
  const allowedUpdates = [`name`, `email`, `password`, `age`];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );
  if (!isValidOperation) {
    return res.status(400).send({ error: `Invalid field to Update!` });
  }
  try {
    updates.forEach((update) => (req.user[update] = req.body[update]));
    await req.user.save();
    res.send(req.user);
  } catch (e) {
    res.status(500).send(e);
  }
});

userRouter.delete(`/users/me`, auth, async (req, res) => {
  try {
    req.user.remove();
    res.send(req.user);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

module.exports = userRouter;
