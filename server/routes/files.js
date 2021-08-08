var express = require('express');
var router = express.Router();
var files = require('../controllers/file'); 
router.all("/*", files.list);
router.post("/*@mkdir", files.mkdir);   //create folder & sub folders
router.post("/*@mkfile", files.mkfile);  //create new files
router.post("/*@rename", files.rename);  //rename file
router.post("/*@delete", files.delete);  //delete a file
router.get("/*", files.listall);         //search a file or list all files & folders
module.exports = router;
