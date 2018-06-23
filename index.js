#!/usr/bin/env node

// Load variables from .env files
const dotenv = require ('dotenv');
dotenv.load ();

const program = require ('commander');
const axios = require ('axios');

// Set up global variables
const GITHUB_BASE_URL = 'https://api.github.com',
  ROOT_FOLDER_FOR_PAPER_FILE = '/docs',
  DROPBOX_BASE_URL = 'https://api.dropboxapi.com/2/paper/';
const {GITHUB_USERNAME, GITHUB_PASSWORD, PAPER_API, REPO_NAME} = process.env;

/**
 * Async Fn: Returns an array of all the contents of the repository
 * @returns contents [Array]
 */
async function getPublicRepoContents (path = '.') {
  const response = await axios ({
    method: 'GET',
    url: `/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`,
    baseURL: GITHUB_BASE_URL,
  });
  return response.data;
}

/**
 * Async Fn: Tells if the file needs to be created or updated
 * @param fileName [String]: Name of the file
 * for which the check has to performed
 * @returns actionObj [Object]
 * {
 *  action => [String(Enum)]: 'create' / 'update',
 *  sha => [String/undefined]: Sha of the file if it has to be updated else undefined
 * }
 */
async function whatActionToPerform (fileName) {
  const response = await getPublicRepoContents ();
  const docFolder = response.find (c => c.type === 'dir' && c.name === 'docs');

  // console.log (docFolder);
  if (!docFolder) {
    return {
      action: 'create',
    };
  }

  const secondLevelResponse = await getPublicRepoContents ('/docs/');
  const requiredFile = secondLevelResponse.find (
    c => c.type === 'file' && c.name === fileName
  );

  // console.log (requiredFile);
  if (!requiredFile) {
    return {
      action: 'create',
    };
  }

  return {
    action: 'update',
    sha: requiredFile.sha,
  };
}

/**
 * Async Fn: Downloads the doc from dropbox paper
 * @param docId [String]: Id of the doc to be downloaded
 * @returns doc [Object]
 * {
 *  owner => [String]: email of the user,
 *  title: => [String]: title of the doc,
 *  data: => [String]: contents of the doc as an HTML string
 * }
 */
async function downloadDoc (docId) {
  let response;
  try {
    response = await axios ({
      method: 'POST',
      url: '/docs/download',
      baseURL: DROPBOX_BASE_URL,
      headers: {
        Authorization: `Bearer ${PAPER_API}`,
        'Content-Type': 'text/plain',
        'Dropbox-API-Arg': JSON.stringify ({
          doc_id: docId,
          export_format: {'.tag': 'html'},
        }),
      },
    });
    return {
      title: JSON.parse (response.headers['dropbox-api-result'])['title'],
      owner: JSON.parse (response.headers['dropbox-api-result'])['owner'],
      data: response.data,
    };
  } catch (err) {
    console.log (err);
  }
}

/**
 * Async Fn: Creates a file in the repo
 * @param fileName [String]: name of the file to be created
 * @param content [String]: HTML string of the contents of the file
 * @param commitMsg [String]: Commit Msg
 * @returns file [Object]: An Object representing the file just created
 */
async function createFileAndCommit (fileName, content, commitMsg) {
  const response = await axios ({
    method: 'PUT',
    url: `/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${ROOT_FOLDER_FOR_PAPER_FILE}/${fileName}.html`,
    baseURL: GITHUB_BASE_URL,
    data: {
      content: Buffer.form (content).toString ('base64'),
      message: commitMsg,
    },
  });
  return response.data;
}

/**
 * Async Fn: Updates a file in the repo
 * @param fileName [String]: name of the file to be updated
 * @param content [String]: HTML string of the contents of the file
 * @param commitMsg [String]: Commit Msg
 * @param sha [String]: sha for the file to be updated
 * @returns file [Object]: An Object representing the file just updated
 */
async function updateFileInRootFolder (fileName, content, commitMsg, sha) {
  const response = await axios ({
    method: 'PUT',
    url: `/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${ROOT_FOLDER_FOR_PAPER_FILE}/${fileName}.html`,
    baseURL: GITHUB_BASE_URL,
    data: {
      content: Buffer.form (content).toString ('base64'),
      message: commitMsg,
      sha,
    },
  });
  return response.data;
}

/**
 * Gets the docId from the docURL
 * @param docURL [String]: URL of the doc from dropbox
 * @returns docId [String]: Id of the doc
 */
const getDocIdFromDocURL = docURL => {
  const splitArr = docURL.split ('-');
  return splitArr[splitArr.length - 1];
};

/**
 * Gets the name for the file => lower cased hyphen separated
 * from the doc title
 * @param title [String]: title of the paper doc
 * @returns fileName [String]: name of the file
 */
const getFileNameFromDocTitle = title =>
  title.replace (/ /g, '-').toLoweCase ();

program
  .arguments ('<docURL>')
  .action (function (docURL) {
    const docId = getDocIdFromDocURL (docURL);
    // downloadDoc (docId).then (d =>
    // console.log (Buffer.from (d.data).toString ('base64'))
    // );

    whatActionToPerform ('mySecondFile.html').then (console.log);
  })
  .parse (process.argv);
