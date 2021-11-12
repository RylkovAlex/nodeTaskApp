const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error(`Incorrect email adress!`);
        }
      },
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      validate(value) {
        if (value.includes(`123456`)) {
          throw new Error(`123456 is not a password!`);
        }
      },
    },
    age: {
      type: Number,
      validate(value) {
        if (value < 1) {
          throw new Error(`age should be more than one`);
        }
      },
    },
    photo: {
      type: Buffer,
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Виртуальное "поле" + связь моделей
userSchema.virtual(`tasks`, {
  ref: 'Task', // модель с которой связываемся
  localField: `_id`, // поле в текущей моделе по которому связываем data
  foreignField: `owner`, // поле в связанной моделе, data в котором соответствует dat'e в localField
});

userSchema.methods.toJSON = function () {
  const userObject = this.toObject();

  delete userObject.password;
  delete userObject.tokens;
  delete userObject.photo;

  return userObject;
};

userSchema.methods.generateAuthToken = async function () {
  const token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
  this.tokens = [...this.tokens, { token }];
  await this.save();

  return token;
};

userSchema.statics.findByCredentials = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error(`No user with such email: ${email}`);
  }

  const isMatchPasswords = await bcrypt.compare(password, user.password);

  if (!isMatchPasswords) {
    throw new Error(`Wrong password!`);
  }

  return user;
};

userSchema.pre('save', async function (next) {
  if (this.isModified(`password`)) {
    this.password = await bcrypt.hash(this.password, 8);
  }

  next();
});

userSchema.pre(`remove`, async function (next) {
  await this.populate(`tasks`).execPopulate();
  this.tasks.forEach((task) => task.remove());
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
