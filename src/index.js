const express = require(`express`);
const mongoose = require(`mongoose`);

require(`./db/mongoose`);
const userRouter = require(`./routers/user-router`);
const taskRouter = require('./routers/task-router');
const Task = require('./models/task');
const User = require('./models/user');

const app = express();
const port = process.env.PORT;

// to autoconvert request into js object
app.use(express.json());

// routers
app.use(userRouter);
app.use(taskRouter);

app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
