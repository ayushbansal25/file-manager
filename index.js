#!/usr/bin/env node

/* jshint esversion: 6 */
/* jshint node: true */
"use strict";

const express = require("express");
const hbs = require("express-handlebars");
const bodyparser = require("body-parser");
const session = require("express-session");
const busboy = require("connect-busboy");
const flash = require("connect-flash");

const path = require("path");

const filesize = require("filesize");
const octicons = require("octicons");
const handlebars = require("handlebars");
var fileRouter = require('./server/routes/files');
let app = express();
let http = app.listen(process.env.PORT || 8080);

app.set("views", path.join(__dirname, "views"));
app.engine("handlebars", hbs({
	partialsDir: path.join(__dirname, "views", "partials"),
	layoutsDir: path.join(__dirname, "views", "layouts"),
	defaultLayout: "main",
	helpers: {
		either: function(a, b, options) {
			if (a || b) {
				return options.fn(this);
			}
		},
		filesize: filesize,
		octicon: function(i, options) {
			if (!octicons[i]) {
				return new handlebars.SafeString(octicons.question.toSVG());
			}
			return new handlebars.SafeString(octicons[i].toSVG());
		},
		eachpath: function (path, options) {
			if (typeof path != "string") {
				return "";
			}
			let out = "";
			path = path.split("/");
			path.splice(path.length - 1, 1);
			path.unshift("");
			path.forEach((folder, index) => {
				out += options.fn({
					name: folder + "/",
					path: "/" + path.slice(1, index + 1).join("/"),
					current: index === path.length - 1
				});
			});
			return out;
		},
	}
}));
app.set("view engine", "handlebars");

app.use("/@assets", express.static(path.join(__dirname, "assets")));
app.use("/@assets/bootstrap", express.static(path.join(__dirname, "node_modules/bootstrap/dist")));
app.use("/@assets/octicons", express.static(path.join(__dirname, "node_modules/octicons/build")));
app.use("/@assets/jquery", express.static(path.join(__dirname, "node_modules/jquery/dist")));
app.use("/@assets/filesize", express.static(path.join(__dirname, "node_modules/filesize/lib")));
app.use("/@assets/xterm", express.static(path.join(__dirname, "node_modules/xterm")));
app.use("/@assets/xterm-addon-attach", express.static(path.join(__dirname, "node_modules/xterm-addon-attach")));
app.use("/@assets/xterm-addon-fit", express.static(path.join(__dirname, "node_modules/xterm-addon-fit")));

app.use(session({
	secret: process.env.SESSION_KEY || "truebase"
}));
app.use(flash());
app.use(busboy());
app.use(bodyparser.urlencoded());


app.use('/', fileRouter);


