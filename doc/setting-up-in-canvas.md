
# Setting up LogicPenguin with Canvas

## Before you start

You will need either to set up your own server running LogicPenguin or to have an agreement with someone else running a server.

You will need to obtain two pieces of information from the server’s administrator(s): your “consumer key” (a kind of user name) and your “shared consumer secret”. The latter is akin to a password and should be kept secret; it is “shared” only between you and the server administrator(s).

(More information on creating consumer keys and secrets will be given in the system configuration documentation when completed.)

## Creating app configurations

Before any external tool or exercise can be launched from Canvas, a Canvas “app configuration” must be created.

In your Canvas course page (as an instructor), there should be a “Settings” link in the course-specific menu (sometimes hidden behind a hamburger menu button, 󰍜). Navigate to this page.

Click the “Apps” tab at the top, and then the “View App Configurations” button near the upper right.

Hopefully there is now a “+App” button, near the upper right, for adding a new configuration. If this does not appear, it may be that your Canvas administrator needs to give you permission to create App configurations for your course. Contact them before proceeding.

If you click “+App”, a form should open. On this form:

* Keep **Configuration Type** as “Manual Entry”.

* Anything easy to remember can be used for **Name**, e.g., “Logic Penguin Instructor Page”, “Logic Penguin Exercise 1”, etc.

* Fill in your **Consumer Key** and **Shared Secret** obtained from the LogicPenguin server administrator in the appropriate fields.

* The **Launch URL** should consist of `https://`, then the LogicPenguin server’s domain name, followed by `/launch/` and then the short name of the exercise or special page (e.g., the instructor page or grades page) this App configuration launches. Some examples:

  1)  `https://logicpenguin.com/launch/instructorpage` for the instructor page. This is where exercises can be created or edited, extensions granted, grade overrides submitted, etc.
  2)  `https://logicpenguin.com/launch/grades` for a page in which a student can see their individual LogicPenguin scores (if desired).
  3)  `https://logicpenguin.com/launch/exercise3` to launch an exercise with the short name “exercise3” in LogicPenguin’s exercises.

  The first app configuration should be for the instructor page. This must be launched at least once before exercises can be created or imported.

* Change the **Privacy level** to “Public”.

* The other fields (**Domain**, **Custom Fields**, **Description**) may be left blank.

* Click “Submit” to save the app configuration.

A different App configuration must be created for the instructor page, for the grades page, and for each exercise to be added to Canvas.

## Adding the instructor page and grade page to your Canvas course

To use the app configurations created above, they will need to be added as links from your modules or assignments pages.

For the **instructor page** and **grades page**, these are best added to your list of modules.

1. Choose “Modules” from the course-specific menu in Canvas.

2. Create a new module if needed, and click the + button to add something to the module.

3. From the drop-down, select “External Tool” for the type of module addition.

4. Most likely, a list of configured apps will appear. Choose the one you created using the instructions above, or enter its launch URL into the URL field at the bottom.

5. Click “Add Item” to finish adding a link to your module.

6. The instructor page link should most likely *not* be “published”, as it is not something students can or should use. (LogicPenguin will not allow the instructor page to be launched by a non-instructor, but it is still less confusing for them for it not to be there.)

  The grades page link, however, must be published in order for students to use it to see their own scores.

For **exercises**, or at least those that contribute to a student’s grades, it is better to add them as assignments.

1. Choose “Assignments” from the course-specific menu in Canvas.

2. If necessary, create a new assignment group by clicking the “+Group” button, or make use of an existing group.

3. From the group header, click the + button to add an assignment.

4. In the Pop-up form:
  * Choose “External Tool” for the **Type**.
  * For **Name**, fill in what would match the “full title” used in the LogicPenguin exercises list, differing only adding extra material in parentheses, e.g. “Credit Exercise 4 (due Feb. 12)”. (Other names may be used, but they may interfere with CSV grade imports.)
  * Fill in the **Due date/time** and **Points** as appropriate for your schedule and grading scheme.
  * Click “More Options”. Under **Submission Type Options**, either enter the launch URL for the exercise, or use the “Find” button and select the name of the app configuration created for the exercise using the instructions above.
  * Other options in this form can be changed if desired.
  * Click “Save” (or “Save & Publish”) to save the assignment.

5. Exercises must be published before students can access them. You may also wish to add links to assignments you create from the modules page. Click the + button in the appropriate module, and use “Assignment” from the drop-down (often the default), and choose the assignment from the list.
