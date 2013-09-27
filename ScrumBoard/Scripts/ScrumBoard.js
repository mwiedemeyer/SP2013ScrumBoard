'use strict';

var scrumListName = "ScrumBoard";
var scrumUserListName = "ScrumBoardUser";
var scrumSprintListName = "ScrumBoardSprint";
var userColors = {};
var pollingInterval = 5000; // in milliseconds
var hostUrl = "";

function getQueryStringParameter(paramToRetrieve) {
    var params =
    document.URL.split("?")[1].split("&");
    var strParams = "";
    for (var i = 0; i < params.length; i = i + 1) {
        var singleParam = params[i].split("=");
        if (singleParam[0] === paramToRetrieve)
            return singleParam[1];
    }
}

// initial load
$(document).ready(function () {

    hostUrl = decodeURIComponent(getQueryStringParameter("SPHostUrl"));

    $("#scrumSprintListUrl").attr("href", hostUrl + "/Lists/" + scrumSprintListName);
    $("#scrumUserListUrl").attr("href", hostUrl + "/Lists/" + scrumUserListName);

    setupIfNotAlreadyDone().done(function () {
        // init users before getting items, to have the user colors available
        initAssignedToComboBoxesAndUsers().done(function () {

            // init sprints
            initSprintComboBoxes();

            // load all task items
            var context = new SP.ClientContext.get_current();
            var web = getWeb(context);
            var list = web.get_lists().getByTitle(scrumListName);
            var items = list.getItems(SP.CamlQuery.createAllItemsQuery());

            context.load(items);
            context.executeQueryAsync(
                function () {
                    for (var i = 0; i < items.get_count() ; i++) {
                        var item = items.get_item(i);
                        var id = item.get_item("ID");
                        var story = item.get_item("Story");
                        var storyAsId = story.replace(/\s/g, '');
                        var status = item.get_item("Status");
                        var assignedTo = item.get_item("AssignedTo");
                        var prio = item.get_item("Priority");
                        var desc = item.get_item("Description");
                        var sprint = item.get_item("Sprint");

                        // if first entry for story, create story row
                        if ($("tr#" + storyAsId).length === 0) {
                            createStory(story);
                        }

                        createTaskItem(story, desc, status, id, prio, assignedTo, sprint);
                    }

                    initEventHandler();
                    initEditDialog();
                    initNewStoryDialog();
                    initDragDrop();
                    initFilterByStory();

                    // enable jQuery style tooltips
                    $(document).tooltip();

                    // set sprint filter after all items are created
                    changeSprintFilter();

                    window.setInterval(pollForChanges, pollingInterval);
                },
                function () {
                });
        });
    });
});

function setupIfNotAlreadyDone() {
    var deferred = $.Deferred();

    var context = SP.ClientContext.get_current();
    var web = getWeb(context);
    var lists = web.get_lists();
    var userList = lists.getByTitle(scrumUserListName);
    var sprintList = lists.getByTitle(scrumSprintListName);
    var taskList = lists.getByTitle(scrumListName);
    context.load(userList);
    context.executeQueryAsync(
        function () {
            deferred.resolve();
        },
        function (sender, args) {
            var lc1 = new SP.ListCreationInformation();
            lc1.set_templateType(SP.ListTemplateType.genericList);
            lc1.set_title(scrumUserListName);
            var newUserList = lists.add(lc1);
            context.load(newUserList);
            var fields = newUserList.get_fields();
            fields.addFieldAsXml("<Field Type='Text' DisplayName='Color' Name='Color' />", true, SP.AddFieldOptions.addToDefaultContentType);
            context.load(fields);

            var lc2 = new SP.ListCreationInformation();
            lc2.set_templateType(SP.ListTemplateType.genericList);
            lc2.set_title(scrumSprintListName);
            var newSprintList = lists.add(lc2);
            context.load(newSprintList);
            fields = newSprintList.get_fields();
            fields.addFieldAsXml("<Field Type='DateTime' DisplayName='StartDate' Name='StartDate' Format='DateOnly' />", true, SP.AddFieldOptions.addToDefaultContentType);
            fields.addFieldAsXml("<Field Type='DateTime' DisplayName='EndDate' Name='EndDate' Format='DateOnly' />", true, SP.AddFieldOptions.addToDefaultContentType);
            context.load(fields);

            var lc3 = new SP.ListCreationInformation();
            lc3.set_templateType(SP.ListTemplateType.genericList);
            lc3.set_title(scrumListName);
            var newScrumList = lists.add(lc3);
            context.load(newScrumList);
            fields = newScrumList.get_fields();
            fields.addFieldAsXml("<Field Type='Note' TextOnly='True' DisplayName='Description' Name='Description' />", true, SP.AddFieldOptions.addToDefaultContentType);
            fields.addFieldAsXml("<Field Type='Text' DisplayName='Story' Name='Story' />", true, SP.AddFieldOptions.addToDefaultContentType);
            fields.addFieldAsXml("<Field Type='Text' DisplayName='Status' Name='Status' />", true, SP.AddFieldOptions.addToDefaultContentType);
            fields.addFieldAsXml("<Field Type='Text' DisplayName='Priority' Name='Priority' />", true, SP.AddFieldOptions.addToDefaultContentType);
            fields.addFieldAsXml("<Field Type='Text' DisplayName='AssignedTo' Name='AssignedTo' />", true, SP.AddFieldOptions.addToDefaultContentType);
            fields.addFieldAsXml("<Field Type='Text' DisplayName='Sprint' Name='Sprint' />", true, SP.AddFieldOptions.addToDefaultContentType);
            context.load(fields);

            context.executeQueryAsync(
                function () {
                    deferred.resolve();
                },
                function (sender, args) {
                    alert("Something went wrong during initial setup. Please delete all existing lists starting with 'ScrumBoard*' and try again.");
                    deferred.reject();
                });
        });

    return deferred.promise();
}

//#region Init functions

function initAssignedToComboBoxesAndUsers() {

    var deferred = $.Deferred();

    var context = new SP.ClientContext.get_current();
    var web = getWeb(context);
    var list = web.get_lists().getByTitle(scrumUserListName);
    var items = list.getItems(SP.CamlQuery.createAllItemsQuery());

    context.load(items);
    context.executeQueryAsync(
        function () {
            if (items.get_count() < 1) {
                $("#newHereHint").show();
            }
            for (var i = 0; i < items.get_count() ; i++) {
                var item = items.get_item(i);
                var title = item.get_item("Title");
                var color = item.get_item("Color");
                $("#ItemAssignedTo").append('<option value="' + title + '">' + title + '</option>');
                $("#filterByName").append('<option value="' + title + '">' + title + '</option>');

                userColors[title] = color;
            }

            $("#filterByName").change(function () {
                var name = $("#filterByName option:selected").val();
                $(".task").show();
                if (name !== "all") {
                    $(".task[data-assignedTo!='" + name + "']").hide();
                }
            });
            deferred.resolve();
        }, function () {
            deferred.reject();
        });

    return deferred.promise();
}

function initEventHandler() {
    // edit task click
    $(document).on("click", ".edit-task", function () {
        var id = $(this).parent().attr("id");
        var prio = $(this).parent().attr("data-prio");
        var story = $(this).parent().attr("data-story");
        var sprint = $(this).parent().attr("data-sprint");
        var storyAsId = story.replace(/\s/g, '');
        var desc = $(this).parent().find(".title .title-inner").text();
        var assignedTo = $(this).parent().find(".assignment").text();

        $("#modifyItemDialog").dialog("open");

        $("#modifyItemDialog").attr("data-itemId", id);
        $("#ItemDesc").val(desc);
        $("#ItemAssignedTo option[value='" + assignedTo + "']").attr("selected", "selected");
        $("#ItemStory option[value='" + storyAsId + "']").attr("selected", "selected");
        $("#ItemPriority option[value='" + prio + "']").attr("selected", "selected");
        $("#ItemSprint option[value='" + sprint + "']").attr("selected", "selected");
    });

    // delete task click
    $(document).on("click", ".delete-task", function () {
        if (confirm("Delete this task?")) {
            var id = $(this).parent().attr("id");
            $(this).parent().fadeOut();

            deleteSPItem(id);
        }
    });

    // add task click
    $(document).on("click", ".plus-button", function () {
        // set item id to empty string to create a new item
        $("#modifyItemDialog").attr("data-itemId", "");
        $("#modifyItemDialog").dialog("open");
    });

    // add new story click
    $("#newStoryButton").click(function () {
        $("#newStoryDialog").dialog("open");
    });
}

function initEditDialog() {
    // init Add/Update item dialog
    $("#modifyItemDialog").dialog({
        autoOpen: false,
        width: 350,
        height: 500,
        modal: true,
        open: function () {
            $("#ItemStory option").remove();
            $(".storyBox").each(function () {
                var story = $(this).attr("data-storyName");
                var storyAsId = story.replace(/\s/g, '');
                $("#ItemStory").append('<option value="' + storyAsId + '">' + story + '</option>');
            });
            var itemId = $("#modifyItemDialog").attr("data-itemId");
            if (itemId === "") {
                $("#ItemDesc").val("");
            }
        },
        buttons: {
            "Save": function () {
                var itemId = $("#modifyItemDialog").attr("data-itemId");

                var desc = $("#ItemDesc").val();
                var story = $("#ItemStory option:selected").text();
                var assignedTo = $("#ItemAssignedTo option:selected").val();
                var prio = $("#ItemPriority option:selected").val();
                var sprint = $("#ItemSprint option:selected").val();

                if (desc === "" || story === "" || assignedTo === "" || prio === "" || sprint === "") {
                    alert("Please fill in all fields.");
                    return;
                }

                // create new item
                if (itemId === "") {
                    addSPItem(story, desc, assignedTo, prio, sprint, function (newItemId) {
                        createTaskItem(story, desc, "ToDo", newItemId, prio, assignedTo, sprint);
                    });
                }
                else {
                    // update existing item
                    updateSPItem(itemId, story, desc, assignedTo, prio, sprint);
                    updateTaskItem(itemId, story, desc, assignedTo, prio, sprint);
                }
                $(this).dialog("close");
            }
        }
    });
}

function initNewStoryDialog() {
    // init new story dialog
    $("#newStoryDialog").dialog({
        autoOpen: false,
        width: 250,
        height: 200,
        modal: true,
        buttons: {
            "Save": function () {
                var story = $("#NewStoryName").val();
                createStory(story);
                $(this).dialog("close");
            }
        }
    });
}

function initDragDrop() {
    $(".task").draggable({
        handle: ".handle",
        revert: "invalid",
        zIndex: 999
    });
    $(".dropTarget").droppable({
        accept: ".task",
        drop: function (event, ui) {
            var $source = ui.draggable;
            var id = $source.attr("id");
            var assignedTo = $source.attr("data-assignedTo");
            var $target = $(event.target);
            var targetStatus = $target.attr("data-targetStatus");
            var targetStory = $target.parent("tr").find(".storyBox").attr("data-storyName");

            // remove top/left styles to display it in the correct cell
            $source.removeAttr("style");
            $source.appendTo($target);

            $source.attr("data-story", targetStory);

            updateSPStatus(id, targetStatus, targetStory);
        }
    });
}

function initFilterByStory() {
    $("#filterByStory").change(function () {
        var story = $("#filterByStory option:selected").val();
        var storyAsId = story.replace(/\s/g, '');
        $(".storyRow").hide();
        if (storyAsId !== "all") {
            $(".storyRow").filter("#" + storyAsId + "").show();
        }
        else {
            $(".storyRow").show();
        }
    });
}

function initSprintComboBoxes() {

    var context = new SP.ClientContext.get_current();
    var web = getWeb(context);
    var list = web.get_lists().getByTitle(scrumSprintListName);
    var items = list.getItems(SP.CamlQuery.createAllItemsQuery());

    context.load(items);
    context.executeQueryAsync(
        function () {
            if (items.get_count() < 1) {
                $("#newHereHint").show();
            }
            for (var i = 0; i < items.get_count() ; i++) {
                var item = items.get_item(i);
                var title = item.get_item("Title");
                var startDate = item.get_item("StartDate");
                var endDate = item.get_item("EndDate");
                $("#ItemSprint").append('<option value="' + title + '">' + title + '</option>');
                $("#filterBySprint").append('<option data-startDate="' + startDate + '" data-endDate="' + endDate + '" value="' + title + '">' + title + '</option>');
            }

            $("#filterBySprint").change(changeSprintFilter);

            // default selection
            $("#filterBySprint option:eq(1)").attr("selected", "selected");
            var today = new Date();
            $("#filterBySprint option").each(function () {
                var startString = $(this).attr("data-startDate");
                var endString = $(this).attr("data-endDate");
                if (startString !== undefined && endString !== undefined) {
                    var start = Date.parseLocale(startString, "yyyy-MM-dd HH:mm:ss");
                    var end = Date.parseLocale(endString, "yyyy-MM-dd HH:mm:ss");
                    if (today >= start && today <= end) {
                        $(this).attr("selected", "selected");
                        return false;
                    }
                }
            });
        },
        function () {
        });
}

function changeSprintFilter() {
    var sprint = $("#filterBySprint option:selected").val();
    $(".task2").show();
    if (sprint !== "all") {
        $(".task2[data-sprint!='" + sprint + "']").hide();
    }
}

//#endregion

//#region Manipulate DOM

function createStory(story) {
    var storyAsId = story.replace(/\s/g, '');

    $("#boardTable tbody").append('<tr id="' + storyAsId + '" class="storyRow">'
        + '<td class="story"><div class="storyBox" data-storyName="' + story + '">' + story + '</div></td>'
        + '<td class="plus"><div class="plus-button" title="Add new task"><img src="../Images/plus.gif" alt="Add new task" /></div></td>'
        + '<td class="todo dropTarget" data-targetStatus="ToDo"></td><td class="inprogress dropTarget" data-targetStatus="InProgress"></td><td class="verify dropTarget" data-targetStatus="Verify"></td><td class="done dropTarget" data-targetStatus="Done"></td></tr>');

    // re-init drag&drop because there is no "live" handler for droppable,
    // so it has to be (re-)attached to all to include the newly created story
    initDragDrop();

    $("#filterByStory").append('<option value="' + storyAsId + '">' + story + '</option>');
}

function createTaskItem(story, desc, status, id, prio, assignedTo, sprint) {
    var storyAsId = story.replace(/\s/g, '');
    var userColor = userColors[assignedTo];
    prio = prio.toLowerCase();

    $("tr#" + storyAsId + " td." + status.toLowerCase()).append('<div id="' + id + '" style="display:none;" class="task task2 ' + prio + '" data-prio="' + prio + '" data-story="' + story + '" data-assignedTo="' + assignedTo + '" data-sprint="' + sprint + '">'
        + '<div class="handle"></div>'
        + '<div class="title" title="' + desc + '"><pre class="title-inner">' + desc + '</pre></div>'
        + '<div class="assignment" style="background-color: ' + userColor + ';">' + assignedTo + '</div><a href="#" class="delete-task">Löschen</a><a href="#" class="edit-task">Edit</a></div>');

    $('#' + id).fadeIn();

    // re-init drag&drop because there is no "live" handler for draggable,
    // so it has to be (re-)attached to all to include the newly created story
    initDragDrop();

}

function updateTaskItem(itemId, story, desc, assignedTo, prio, sprint, status) {
    if (status === null || status === undefined || status === "undefined" || status === "") {
        status = $('#' + itemId).parent('td').attr('data-targetStatus');
    }

    var oldStory = $('#' + itemId).attr('data-story');
    var oldDesc = $('#' + itemId + ' .title-inner').text();
    var oldStatus = $('#' + itemId).parent('td').attr('data-targetStatus');
    var oldPrio = $('#' + itemId).attr('data-prio');
    var oldAssignedTo = $('#' + itemId).attr('data-assignedTo');
    var oldSprint = $('#' + itemId).attr('data-sprint');

    if (oldSprint === sprint && oldStory === story && oldDesc.length === desc.length && oldStatus === status && oldPrio === prio.toLowerCase() && oldAssignedTo === assignedTo)
        return;

    // remove, but create new only if the same filtered sprint
    $('#' + itemId).remove();
    var filteredSprint = $("#filterBySprint option:selected").val();
    if (filteredSprint === "all" || filteredSprint === sprint) {
        createTaskItem(story, desc, status, itemId, prio, assignedTo, sprint);
    }
}

//#endregion

//#region SharePoint functions

function getWeb(context) {
    var hostcontext = new SP.AppContextSite(context, hostUrl);
    return hostcontext.get_web();
}

function updateSPStatus(id, newStatus, newStory) {
    var notifyId = SP.UI.Notify.addNotification('Updating...', true);

    var context = new SP.ClientContext.get_current();
    var web = getWeb(context);
    var list = web.get_lists().getByTitle(scrumListName);
    var item = list.getItemById(id);
    context.load(item);

    item.set_item("Status", newStatus);
    item.set_item("Story", newStory);
    item.update();

    context.executeQueryAsync(function () {
        SP.UI.Notify.removeNotification(notifyId);
    }, function (sender, args) {
        SP.UI.Notify.removeNotification(notifyId);
        SP.UI.Notify.addNotification('Fehler! Bitte die Seite neu laden.', false);
        var statusId = SP.UI.Status.addStatus("Fehler : ", args.get_message(), true);
        SP.UI.Status.setStatusPriColor(statusId, "red");
    });
}

function updateSPItem(id, story, description, assignedTo, priority, sprint) {
    var notifyId = SP.UI.Notify.addNotification('Updating...', true);

    var context = new SP.ClientContext.get_current();
    var web = getWeb(context);
    var list = web.get_lists().getByTitle(scrumListName);
    var item = list.getItemById(id);
    context.load(item);

    item.set_item("Story", story);
    item.set_item("Description", description);
    item.set_item("AssignedTo", assignedTo);
    item.set_item("Priority", priority);
    item.set_item("Sprint", sprint);
    item.update();

    context.executeQueryAsync(function () {
        SP.UI.Notify.removeNotification(notifyId);
    }, function (sender, args) {
        SP.UI.Notify.removeNotification(notifyId);
        SP.UI.Notify.addNotification('Fehler! Bitte die Seite neu laden.', false);
        var statusId = SP.UI.Status.addStatus("Fehler : ", args.get_message(), true);
        SP.UI.Status.setStatusPriColor(statusId, "red");
    });
}

function addSPItem(story, description, assignedTo, priority, sprint, completedCallback) {
    var notifyId = SP.UI.Notify.addNotification('Updating...', true);

    var context = new SP.ClientContext.get_current();
    var web = getWeb(context);
    var list = web.get_lists().getByTitle(scrumListName);

    var lc = new SP.ListItemCreationInformation();
    var item = list.addItem(lc);
    context.load(item);

    item.set_item("Title", description.substring(0, 200));
    item.set_item("Status", "ToDo");
    item.set_item("Story", story);
    item.set_item("Description", description);
    item.set_item("AssignedTo", assignedTo);
    item.set_item("Priority", priority);
    item.set_item("Sprint", sprint);
    item.update();

    context.executeQueryAsync(function () {
        SP.UI.Notify.removeNotification(notifyId);
        var newItemId = item.get_id();
        completedCallback(newItemId);
    }, function (sender, args) {
        SP.UI.Notify.removeNotification(notifyId);
        SP.UI.Notify.addNotification('Fehler! Bitte die Seite neu laden.', false);
        var statusId = SP.UI.Status.addStatus("Fehler : ", args.get_message(), true);
        SP.UI.Status.setStatusPriColor(statusId, "red");
    });
}

function deleteSPItem(id) {
    var notifyId = SP.UI.Notify.addNotification('Deleting...', true);

    var context = new SP.ClientContext.get_current();
    var web = getWeb(context);
    var list = web.get_lists().getByTitle(scrumListName);
    var item = list.getItemById(id);
    context.load(item);
    item.deleteObject();

    context.executeQueryAsync(function () {
        SP.UI.Notify.removeNotification(notifyId);
    }, function (sender, args) {
        SP.UI.Notify.removeNotification(notifyId);
        SP.UI.Notify.addNotification('Fehler! Bitte die Seite neu laden.', false);
        var statusId = SP.UI.Status.addStatus("Fehler : ", args.get_message(), true);
        SP.UI.Status.setStatusPriColor(statusId, "red");
    });
}

//#endregion

//#region Polling

function pollForChanges() {

    var context = new SP.ClientContext.get_current();
    var web = getWeb(context);
    var list = web.get_lists().getByTitle(scrumListName);
    var items = list.getItems(SP.CamlQuery.createAllItemsQuery());

    context.load(items);
    context.executeQueryAsync(
        function () {
            for (var i = 0; i < items.get_count() ; i++) {
                var item = items.get_item(i);
                var id = item.get_item("ID");
                var story = item.get_item("Story");
                var storyAsId = story.replace(/\s/g, '');
                var status = item.get_item("Status");
                var assignedTo = item.get_item("AssignedTo");
                var prio = item.get_item("Priority");
                var desc = item.get_item("Description");
                var sprint = item.get_item("Sprint");

                // if first entry for story, create story row
                if ($("tr#" + storyAsId).length === 0) {
                    createStory(story);
                }

                updateTaskItem(id, story, desc, assignedTo, prio, sprint, status);
            }
        }, function () {
        });
}

//#endregion