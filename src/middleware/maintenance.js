module.exports = (req, res, next) => {
  res.status(503).send(`Server is temporarily unavalible`)
}
