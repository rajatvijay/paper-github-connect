#!/usr/bin/env node

// Load variables from .env files
const dotenv = require ('dotenv');
dotenv.load ();

const program = require ('commander');
const axios = require ('axios');

// Set up global variables
const GITHUB_BASE_URL = 'https://api.github.com',
  ROOT_FOLDER_FOR_PAPER_FILE = 'docs',
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
  try {
    const response = await axios ({
      method: 'PUT',
      url: `/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${ROOT_FOLDER_FOR_PAPER_FILE}/${fileName}.html`,
      baseURL: GITHUB_BASE_URL,
      data: {
        content: Buffer.from (content).toString ('base64'),
        message: commitMsg,
      },
      auth: {
        username: GITHUB_USERNAME,
        password: GITHUB_PASSWORD,
      },
    });
    return response.data;
  } catch (err) {
    console.log (err);
  }
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
      content: Buffer.from (content).toString ('base64'),
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
  title.replace (/ /g, '-').toLowerCase ();

/**
 * Pushes a paper doc to Github
 * @param docURL [String]: URL of the doc to be pushed on github
 * @param commitMsg [String]: Commit message for git
 * @returns fileObj [Object]: File Object representing file on the Github
 */
async function pushDocFromPaperToGithub (docURL, commitMsg) {
  const docId = getDocIdFromDocURL (docURL);
  console.log (docId);

  const doc = await downloadDoc (docId);
  console.log (doc);

  const fileName = getFileNameFromDocTitle (doc.title);
  console.log (fileName);

  const action = await whatActionToPerform (fileName);
  console.log (action);

  let fileInGithub;
  switch (action.action) {
    case 'create':
      fileInGithub = await createFileAndCommit (fileName, doc.data, commitMsg);
      console.log (fileInGithub);
      return fileInGithub;
    case 'update':
      fileInGithub = await updateFileInRootFolder (
        fileName,
        doc.data,
        commitMsg,
        action.sha
      );
      console.log (fileInGithub);
      return fileInGithub;
    default:
      fileInGithub = await createFileAndCommit (fileName, doc.data, commitMsg);
      console.log (fileInGithub);
      return fileInGithub;
  }
}

program
  .arguments ('<docURL>')
  .action (function (docURL) {
    // TODO: Check if the env file has all the required vars + the commitMsg
    const commitMessage = 'My Dummy Commit';
    pushDocFromPaperToGithub (docURL, commitMessage).then (file =>
      console.log (file.name)
    );
  })
  .parse (process.argv);
