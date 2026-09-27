# Using CSV files to upload LogicPenguin scores to Canvas

## Preliminary notes

For more about the structure of CSV files used in Canvas imports and exports, see its documentation about them here:

<https://community.instructure.com/en/kb/articles/660862-how-do-i-import-grades-in-the-gradebook>

In order for this process to work, LogicPenguin must be able to tell which columns in your Canvas gradebook correspond to its exercises.

This can be ensured by naming the exercises (when added to Canvas’s “Assignments” blocks) the same as their “Full title” in LogicPenguin (*not* the “Short name” used in the launch urls). However, extra information in parentheses in the Canvas name will be ignored.

For example, a Canvas assignment named “Credit Exercise 10 (due Dec 5)” will match an exercise named “Credit Exercise 10” in LogicPenguin’s list of exercises.

Note also that the “filling in” done by LogicPenguin is done inside the browser. This process does not upload any additional information from your Canvas gradebook to the LogicPenguin server at any point, and therefore should be FERPA-safe.

## Exporting your Canvas gradebook and modifying it with LogicPenguin

1) From your course’s “Grades” page (as viewed by the instructor), click the “Export” drop-down near the top right, and choose “Export Entire Gradebook”.

2) When it is done processing, a CSV file should appear in your browser’s downloads. Take note of its name and location.

3) Navigate to the LogicPenguin instructor page for your course.

4) Go to the “Students” tab if it does not open automatically.

5) Scroll to the very bottom, where it reads “Fill in existing Canvas gradebook csv file”. Click the button below and choose the CSV file downloaded in step 2 above.

6) After the file is transferred, a small dialog box should appear including a button labeled “download updated csv”. When clicked, again a new CSV file (starting with “`LogicPenguin-updated-canvas-gradebook`”) should appear in your browser’s downloads.

## Importing the updated gradebook back into Canvas

7) From your Canvas course’s “Grades” page (as viewed by the instructor), click the “Import” button near the upper right.

8) Under “Choose a CSV file to upload”, choose the updated CSV file downloaded from the LogicPenguin site in step 6 above.

9) Click the “Upload Data” button.

10) After some processing, Canvas will show you a list of changes the import will make. You can make modifications here if needed. When ready, click “Save Changes” at the bottom.

11) Canvas will redirect you back to your grading page. Sometimes the changes will not yet be reflected on the grade page, as Canvas finishes the import in the background. Wait a bit and reload if need be.
