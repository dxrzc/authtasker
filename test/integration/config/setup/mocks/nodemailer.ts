// https://github.com/doublesharp/nodemailer-mock#example-using-jest

import nodemailer from "nodemailer";

const nodemailermock = require("nodemailer-mock").getMockFor(nodemailer);

module.exports = nodemailermock;