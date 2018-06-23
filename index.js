#!/usr/bin/env node

// console.log ('Hello Shell!');

const program = require ('commander');

program
  .arguments ('<docURL>')
  .action (function (docURL) {
    console.log (docURL);
    console.log (process.env);
  })
  .parse (process.argv);
