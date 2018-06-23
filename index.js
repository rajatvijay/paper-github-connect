#!/usr/bin/env node

// console.log ('Hello Shell!');
const dotenv = require ('dotenv');
dotenv.load ();

const program = require ('commander');
const axios = require ('axios');

const GITHUB_BASE_URL = 'https://api.github.com';

async function getPublicRepos (username) {
  const response = await axios ({
    method: 'GET',
    url: `/users/${username}/repos`,
    baseURL: GITHUB_BASE_URL,
  });
  return response.data;
}

async function getPublicSelfOwnedRepos (username) {
  const repos = await getPublicRepos (username);
  return repos.filter (r => r.owner.login === username);
}

program
  .arguments ('<docURL>')
  .action (function (docURL) {
    const {GITHUB_USERNAME, GITHUB_PASSWORD, PAPER_API} = process.env;

    getPublicSelfOwnedRepos (GITHUB_USERNAME).then ();
    // console.log
  })
  .parse (process.argv);
