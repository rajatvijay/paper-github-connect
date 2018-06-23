# Paper Github Connect

## Product Features

1.  When running the command user should only provide the docURL
2.  Github user, password, paper API key and the repo name will taken from the .env file
3.  If the above mentioned values are not found in the .env file, the user should be prompted
4.  Look if the repo already contains the docs folder, else create it
5.  Look for the file with the same name as of the doc, if not found create it.
6.  Update the contents of the file with the new one.
7.  Create a new commit.
8.  Start uploading to the selected repo and show the progress bar
9.  Log the message that the doc has been uploaded
