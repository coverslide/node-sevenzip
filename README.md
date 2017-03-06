Sevenzip
========

A utility for running sevenzip from node.

Requirements
============

A version of node that supports async is required. The Sevenzip executable should also exist on the same server.

Setup
=====

This library assumes that the '7z' executable exists in the $PATH environment.
In order to specify the location of 7z, do the following:

```
const SevenZip = require('sevenzip');

SevenZip.executable = '/usr/local/bin/7z';
```

API
===

SevenZip.getFiles
-----------------

Gets a list of files and their attributes from an archive file that sevenzip supports.

SevenZip.extractFile
--------------------

Extracts a file to a temporary folder and returns the path to the file.
