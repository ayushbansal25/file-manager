
const KEY = process.env.KEY ? base32.decode(process.env.KEY.replace(/ /g, "")) : null;
const SMALL_IMAGE_MAX_SIZE = 750 * 1024;  // 750 KB
const EXT_IMAGES = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif", ".tiff"];
const shellable = process.env.SHELL != "false" && process.env.SHELL;
const cmdable = process.env.CMD != "false" && process.env.CMD;
const base32 = require("thirty-two");
const fs = require("fs");
const rimraf = require("rimraf");
const path = require("path");
const stringConstants=require("../helpers/stringConstants");
function relative(...paths) {
	return paths.reduce((a, b) => path.join(a, b), process.cwd());
}
function flashify(req, obj) {
	let error = req.flash("error");
	if (error && error.length > 0) {
		if (!obj.errors) {
			obj.errors = [];
		}
		obj.errors.push(error);
	}
	let success = req.flash("success");
	if (success && success.length > 0) {
		if (!obj.successes) {
			obj.successes = [];
		}
		obj.successes.push(success);
	}
	obj.isloginenabled = !!KEY;
	return obj;
}
function isimage(f) {
	for (const ext of EXT_IMAGES) {
		if (f.endsWith(ext)) {
			return true;
		}
	}
	return false;
}

exports.list = function(req, res,next) { 
    res.filename = req.params[0];

	let fileExists = new Promise((resolve, reject) => {
		// check if file exists
		fs.stat(relative(res.filename), (err, stats) => {
			if (err) {
				return reject(err);
			}
			return resolve(stats);
		});
	});

	fileExists.then((stats) => {
		res.stats = stats;
		next();
	}).catch((err) => {
		res.stats = { error: err };
		next();
	});
}

exports.mkdir = function(req,res){
    res.filename = req.params[0];

	let folder = req.body.folder;
	if (!folder || folder.length < 1) {
		return res.status(400).end();
	}

	let fileExists = new Promise((resolve, reject) => {
		// Check if file exists
		fs.stat(relative(res.filename, folder), (err, stats) => {
			if (err) {
				return reject(err);
			}
			return resolve(stats);
		});
	});

	fileExists.then((stats) => {
		req.flash("error", stringConstants.folderAlreadyExist);
		res.redirect("back");
	}).catch((err) => {
		fs.mkdir(relative(res.filename, folder), (err) => {
			if (err) {
				console.warn(err);
				req.flash("error", err.toString());
				res.redirect("back");
				return;
			}
			req.flash("success", stringConstants.folderCreated);
			res.redirect("back");
		});
	});
}
exports.mkfile = function(req,res){
    res.filename = req.params[0];

	let folder = req.body.file;
	if (!folder || folder.length < 1) {
		return res.status(400).end();
	}

	let fileExists = new Promise((resolve, reject) => {
		// Check if file exists
		fs.stat(relative(res.filename, folder), (err, stats) => {
			if (err) {
				return reject(err);
			}
			return resolve(stats);
		});
	});

	fileExists.then((stats) => {
		req.flash("error", "File exists, cannot overwrite. ");
		res.redirect("back");
	}).catch((err) => {
		fs.writeFile(relative(res.filename, folder), "Hey there!", (err) => {
			if (err) {
				console.warn(err);
				req.flash("error", err.toString());
				res.redirect("back");
				return;
			}
			req.flash("success", "File created. ");
			res.redirect("back");
		});
	});
}
exports.rename = function(req,res){
    res.filename = req.params[0];

	let oldfile = JSON.parse(req.body.oldfile);
    let newfile = req.body.newfile;
	if (!oldfile || oldfile.length < 1) {
		return res.status(400).end();
	}
    if (!oldfile || oldfile.length > 1) {
        console.log("oldfile",oldfile.length);
        req.flash("error", stringConstants.singleFileError);
		res.redirect("back");
		return
	}

	let fileExists = new Promise((resolve, reject) => {
		// Check if file exists
		fs.stat(relative(res.filename, oldfile), (err, stats) => {
			if (err) {
				return reject(err);
			}
			return resolve(stats);
		});
	});

	fileExists.then((stats) => {
		req.flash("error", stringConstants.fileAlreadyexist);
		res.redirect("back");
	}).catch((err) => {
		fs.rename(relative(res.filename, oldfile[0]), relative(res.filename, newfile), (err) => {
			if (err) {
				console.warn(err);
				req.flash("error", err.toString());
				res.redirect("back");
				return;
			}
			req.flash("success", stringConstants.fileRenamed);
			res.redirect("back");
		});
	});
}
exports.delete =function(req,res){
        res.filename = req.params[0];
    
        let files = JSON.parse(req.body.files);
        if (!files || !files.map) {
            req.flash("error", stringConstants.noFileSelected);
            res.redirect("back");
            return; // res.status(400).end();
        }
    
        let promises = files.map(f => {
            return new Promise((resolve, reject) => {
                fs.stat(relative(res.filename, f), (err, stats) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve({
                        name: f,
                        isdirectory: stats.isDirectory(),
                        isfile: stats.isFile()
                    });
                });
            });
        });
        Promise.all(promises).then((files) => {
            let promises = files.map(f => {
                return new Promise((resolve, reject) => {
                    let op = null;
                    if (f.isdirectory) {
                        op = (dir, cb) => rimraf(dir, {
                            glob: false
                        }, cb);
                    }
                    else if (f.isfile) {
                        op = fs.unlink;
                    }
                    if (op) {
                        op(relative(res.filename, f.name), (err) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve();
                        });
                    }
                });
            });
            Promise.all(promises).then(() => {
                req.flash("success", stringConstants.fileDeleted);
                res.redirect("back");
            }).catch((err) => {
                console.warn(err);
                req.flash("error",stringConstants.unableDeleteFile + err);
                res.redirect("back");
            });
        }).catch((err) => {
            console.warn(err);
            req.flash("error", err.toString());
            res.redirect("back");
        });
    
}


exports.trimTags = (str) => {
    str = str.replace(/^\s+|\s+$/g, ''); // trim

    // remove accents, swap ñ for n, etc
    var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
    var to = "aaaaaeeeeeiiiiooooouuuunc------";
    for (var i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -.]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, ''); // collapse dashes
    return str;
}
exports.listall = function(req, res) {
	if (res.stats.error) {
		res.render("list", flashify(req, {
			shellable: shellable,
			cmdable: cmdable,
			path: res.filename,
			errors: [
				res.stats.error
			]
		}));
	}
	else if (res.stats.isDirectory()) {
		if (!req.url.endsWith("/")) {
			return res.redirect(req.url + "/");
		}

		let readDir = new Promise((resolve, reject) => {
			fs.readdir(relative(res.filename), (err, filenames) => {
				if (err) {
					return reject(err);
				}
				return resolve(filenames);
			});
		});

		readDir.then((filenames) => {

			const promises = filenames.map(f => new Promise((resolve, reject) => {
				fs.stat(relative(res.filename, f), (err, stats) => {
					if (err) {
						console.warn(err);
						return resolve({
							name: f,
							error: err
						});
					}
					resolve({
						name: f,
						isdirectory: stats.isDirectory(),
						issmallimage: isimage(f) && stats.size < SMALL_IMAGE_MAX_SIZE,
						size: stats.size
					});
				});
			}));
            
			Promise.all(promises).then((files) => {
                console.log(req.query);
                if(req.query.search){
                    let search=exports.trimTags(req.query.search);
                    console.log(search);
                    var condition = new RegExp(search);
                    files = files.filter(function (el) {
                        return condition.test(el.name);
                    });
                }
				res.render("list", flashify(req, {
					shellable: shellable,
					cmdable: cmdable,
					path: res.filename,
					files: files,
				}));
			}).catch((err) => {
				console.error(err);
				res.render("list", flashify(req, {
					shellable: shellable,
					cmdable: cmdable,
					path: res.filename,
					errors: [
						err
					]
				}));
			});
		}).catch((err) => {
			console.warn(err);
			res.render("list", flashify(req, {
				shellable: shellable,
				cmdable: cmdable,
				path: res.filename,
				errors: [
					err
				]
			}));
		});
	}
	else if (res.stats.isFile()) {
		res.sendFile(relative(res.filename), {
			headers: {
				"Content-Security-Policy": "default-src 'self'; script-src 'none'; sandbox"
			},
			dotfiles: "allow"
		});
	}
}

