<%-- The following 4 lines are ASP.NET directives needed when using SharePoint components --%>

<%@ Page Inherits="Microsoft.SharePoint.WebPartPages.WebPartPage, Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" MasterPageFile="~masterurl/default.master" Language="C#" %>

<%@ Register TagPrefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>

<%-- The markup and script in the following Content element will be placed in the <head> of the page --%>
<asp:Content ContentPlaceHolderID="PlaceHolderAdditionalPageHead" runat="server">
    <script type="text/javascript" src="../Scripts/jquery-1.8.2.min.js"></script>
    <script type="text/javascript" src="/_layouts/15/sp.runtime.js"></script>
    <script type="text/javascript" src="/_layouts/15/sp.js"></script>

    <script type="text/javascript" src="../Scripts/jquery-ui-1.9.1.min.js"></script>
    <script type="text/javascript" src="../Scripts/ScrumBoard.min.js"></script>


    <!-- Add your CSS styles to the following file -->
    <link rel="Stylesheet" type="text/css" href="../Content/App.css" />
    <link type="text/css" rel="stylesheet" href="../Content/jquery-ui-css/jquery-ui.css" />

</asp:Content>

<%-- The markup in the following Content element will be placed in the TitleArea of the page --%>
<asp:Content ContentPlaceHolderID="PlaceHolderPageTitleInTitleArea" runat="server">
    Scrum Board
</asp:Content>

<%-- The markup and script in the following Content element will be placed in the <body> of the page --%>
<asp:Content ContentPlaceHolderID="PlaceHolderMain" runat="server">
    <div>
        Filter by Sprint:
    <select id="filterBySprint" style="min-width: 150px;">
        <option value="all">All</option>
    </select>
        Filter by Domain:
    <select id="filterByStory" style="min-width: 150px;">
        <option value="all">All</option>
    </select>
        Filter by Name:
    <select id="filterByName" style="min-width: 150px;">
        <option value="all">All</option>
    </select>
    </div>

    <table id="boardTable">
        <thead>
            <tr>
                <th class="story">Domains (<span id="newStoryButton">New</span>)</th>
                <th class="plus"></th>
                <th class="todo">To Do</th>
                <th class="inprogress">In Progress</th>
                <th class="verify">Verify</th>
                <th class="done">Done</th>
            </tr>
        </thead>
        <tbody id="boardBody">
        </tbody>
    </table>

    <div id="modifyItemDialog" title="Edit Task" data-itemid="" style="display: none;">
        <label for="ItemDesc">Description:</label><br />
        <textarea id="ItemDesc" rows="6" style="width: 300px;"></textarea>
        <br />
        <br />
        <label for="ItemStory">Domain:</label><br />
        <select id="ItemStory" style="width: 300px; padding: 2px 1px 2px 1px"></select>
        <br />
        <br />
        <label for="ItemAssignedTo">Assigned to:</label><br />
        <select id="ItemAssignedTo" style="width: 300px; padding: 2px 1px 2px 1px"></select>
        <br />
        <br />
        <label for="ItemPriority">Priority:</label><br />
        <select id="ItemPriority" style="width: 300px; padding: 2px 1px 2px 1px">
            <option value="high">High</option>
            <option value="medium" selected="selected">Medium</option>
            <option value="low">Low</option>
        </select>
        <br />
        <br />
        <label for="ItemSprint">Sprint:</label><br />
        <select id="ItemSprint" style="width: 300px; padding: 2px 1px 2px 1px"></select>
    </div>

    <div id="newStoryDialog" title="New Domain" style="display: none;">
        <label for="NewStoryName">Name:</label><br />
        <input type="text" id="NewStoryName" style="width: 200px;" />
    </div>

    <div id="newHereHint" style="display: none;">
        <br />
        <span style="color: red; font-weight: bold;">New Here?</span> First, add a new Sprint and one or more users to the following lists and reload the app:
        <br />
        <ul>
            <li><a id="scrumSprintListUrl" href="#" target="_blank">ScrumBoardSprint</a></li>
            <li><a id="scrumUserListUrl" href="#" target="_blank">ScrumBoardUser</a></li>
        </ul>
        After that start by click on "New Domain" and then on + to create tasks within a domain.
    </div>
</asp:Content>
