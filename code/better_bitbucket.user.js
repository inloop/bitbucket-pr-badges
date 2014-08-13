// ==UserScript==
// @name       Better Bitbucket
// @description Improved pull-request reviews
// @version    1.7
// @author     Juraj Novák, Inloop
// @namespace  http://inloop.eu/
// @match      https://bitbucket.org/*
// @grant      none
// @require    https://raw.githubusercontent.com/uzairfarooq/arrive/master/releases/arrive-2.0.0.min.js
// @updateURL  https://raw.githubusercontent.com/inloop/bitbucket-pr-badges/master/code/better_bitbucket.user.js
// ==/UserScript==

//Define our buttons
/*
	name  - text to insert
	search - what highlight in comments
	title - button title
	hint  - tooltip
	color - markup/button color
	reviewer - show only to reviewer/other
	regex - full regexp object
*/
var buttons = [
	{ name:"BTY", search:"BTY|(B|b)ack (T|t)o (Y|y)ou", title:"&#8595; BTY" , hint:"Reviewer: Back To You", color:"#b50000", reviewer:true, regex: {} },
	{ name:"RFRR", search:"RFRR", title:"RFRR", hint:"Developer: Ready For Re-Review", color:"#e8a317", reviewer:false, regex: {} },
	{ name:"RTM", search:"RTM", title:"&#8593; RTM", hint:"Reviewer: Ready To Merge", color:"#2d6b00", reviewer:true, regex: {} }
];

var loadingReviewsText = " [loading review statuses ...]";

var loadingStatuses = false, hasLoadedStatuses = false;
var lastCommentTime = 0;
var requestCounter = 0, totalRequestCount = 0;
var spanMarkClass = "review-mark", spanLoadingClass = "statuses-loading";

//Compile regexes
for (var i = 0; i < buttons.length; i++) {
	buttons[i].regex = compileRegex(buttons[i].search);
}

function checkForDasboard(url) {
	//Pull request dashboard statuses
	var isDashboard = checkForPRDashBoardUrl();

	if (!isDashboard) {
		hasLoadedStatuses = false;
	}
	
	if (url.indexOf("/api/") > -1) {
		hasLoadedStatuses = false;
		return;
	}
	
	
	if (isDashboard) {
		if (!loadingStatuses && !hasLoadedStatuses) {
			loadingStatuses = true;
			dashboardInsertStatuses(buttons);
		}
	}
}

//USERSCRIPT ONLY
if (typeof CHROME === "undefined") {
	$(document).ajaxSuccess(function(event, xhr, settings) {
		checkForDasboard(settings.url);
	});
}

$(document).ready(function() {
    //Check If on pull-request diff page
	if (!checkForPRUrl()) {
		return false;
	}

    //Get top Buttons toolbar If possible
    var actions = $('#pullrequest-actions .aui-buttons').next();
    var actionsBaseBtn = $("#edit-pullrequest");
	
	//Get overview rows
	var overviewRows = $("#pull-request-diff-header .aui-item dl");
	var rowBase = overviewRows.find(".description");
	
	var statusNone = "<i>None</i>";
    
    var isReviewer = !checkIfRequestAuthor();
	
	//Create Status row
	overviewRows.children(".reviewers-group").after(createRow(rowBase, "Status", statusNone, "review-status"));
    
    //Add our buttons to Top bar
    for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].reviewer !== isReviewer) {
            continue;
        }
        createButton($("#id_new_comment").last(), actionsBaseBtn, buttons[i], false).appendTo(actions);  
    }
    
    //Highlight in comments
	higlightAllComments(buttons, false);
    
    //Listen to changes in comments (for higlighting new comments)
    $("#comments-list").arrive(".comment", function(){
        highlightComment(buttons, $(this).find(".comment-content"), false);
    });
	$("#comments-list").leave(".comment", function(){
		lastCommentTime = 0;
        if (!higlightAllComments(buttons, true)) {
			$("#review-status").html(statusNone);
		}
    });
    
    //Editor is loaded later using ajax
    $("#general-comments").arrive(".markup-type-markdown", function() {  
        var editorActions = $('#general-comments .markItUpHeader ul:not(.overrided-items)').first();
        var editorBaseBtn = editorActions.find(".no-icon");
        var editor = editorActions.parent().parent().find("#id_new_comment"); // a bit hacky!
        editorActions.addClass("overrided-items"); //prevent readding buttons If more editors open
        
        for (var i = buttons.length - 1; i >= 0; i--) {
            if (buttons[i].reviewer !== isReviewer) {
                continue;
            }
            createButton(editor, editorBaseBtn, buttons[i], true).appendTo(editorActions);
        }
    });
});

function dashboardInsertStatuses(buttons) {
	var titleDashboard = $(".section-title h1");
	var statusLoading = "<span class='" + spanLoadingClass + "' style='color:silver;font-size:18px'>" + loadingReviewsText + "</span>";
	if (titleDashboard.length) {
		var div = $(".section-title h1");
		if (!div.hasClass(".spanLoadingClass")) {
			div.append(statusLoading);
		}
	} else {
		var div = $(".aui-page-header-main h1");
		if (!div.hasClass(".spanLoadingClass")) {
			div.append(statusLoading);
		}
	}
	$(".maskable table .iterable-item").each(function () {	
		var url = $(this).find(".execute").attr("href");
		var urlPart = url.substring(1, url.lastIndexOf("/"))
		if (urlPart.length) {
			getStatusOfPullRequest(buttons, urlPart.replace("pull-request", "pullrequests"), $(this).find(".title div"), $(this).find(".execute"));
		}
	});
}

function getStatusOfPullRequest(buttons, part, titleDiv, aDiv) {
	totalRequestCount++;
	$.ajax("/api/1.0/repositories/" + part + "/comments/")
		.done(function (result) {
			var messageLastTime = 0;
			var status = null;
			for (var i = 0; i < result.length; i++) {
				//ignore deleted comments
				if (!result[i].deleted) {
					var messateTime = new Date(result[i].utc_last_updated).getTime();
					var messageText = result[i].content_rendered;
					
					//Search for abbrev
					for (var c = 0; c < buttons.length; c++) {
						if (buttons[c].regex.test(messageText)) {
							if (messateTime > messageLastTime) {
								status = buttons[c];
								messageLastTime = messateTime;
							}
						}
					}
				}
			}
			
			if (status !== null) {
				var spanMark = titleDiv.find("." + spanMarkClass);
				if (spanMark.length > 0) { //prevent duplicates
					spanMark.remove();
				}
				titleDiv.append(createSpanMark(status,false, true));
				aDiv.css("max-width", "80%")
				aDiv.css("float", "left")
				aDiv.css("overflow", "hidden");
			}
		})
		.fail(function () { console.error("dashboardInsertStatuses failed") })
		.always(function () { 
			requestCounter++;
			if (requestCounter >= totalRequestCount) {
				$("." + spanMarkClass).fadeIn();
				$("." + spanLoadingClass).hide();
				loadingStatuses = false;
				hasLoadedStatuses = true;
			}
		});
}

function higlightAllComments(buttons, recalculateTimesOnly) {
	var changed = false;
	$("#comments-list .comment .comment-content").each(function() {
		var content = $(this);
		if (content.length) { //Check If exists
			highlightComment(buttons, content, recalculateTimesOnly);
			changed = true;
		}
	});
	return changed;
}

function highlightComment(buttons, content, recalculateTimesOnly) {
    for (var i = 0; i < buttons.length; i++) {
		var isAdditionalText = (content.text().trim().length > buttons[i].name.length);
		var lengthBeforeReplace = content.html().length;
		var newContent = content.html().replace(buttons[i].regex, createSpanMark(buttons[i], isAdditionalText).prop('outerHTML'));
			
		if (!recalculateTimesOnly) {
			$(content).html(newContent);
		}
		
		//Replaced abbrev.
		if (lengthBeforeReplace !== newContent.length) {
			var commentTimeNode = content.parent().find("time").attr("datetime");
			var commentTime = (new Date(commentTimeNode)).getTime(); //calling parent - should avoid!
			if (commentTime > lastCommentTime) {
				$("#review-status").html(createSpanMark(buttons[i]));
				lastCommentTime = commentTime;
			}
		}
    }
}

function compileRegex(name) {
    return new RegExp("(?!(/\s|^|>)+)" + name + "(?!(/\s|$)+)");
}

function createSpanMark(button, arrow, invisible) {
	return createSpanMark(button, arrow, false);
}

function createSpanMark(button, arrow, invisible) {
    var arrowStr = arrow ? " &#8594;" : "";
	var span = $('<span />');
	span.addClass(spanMarkClass)
		.attr("title", button.hint)
		.css("cursor", "help").css("border-radius", "6px").css("margin", "0px 4px 0px 4px")
		.css("padding", "2px 20px 2px 20px").css("color", "white").css("background-color", button.color)
		.html(button.name + arrowStr).css("display", invisible ? "none" : "inline");
	return span;
}

function createButton(edit, baseBtn, button, isEditor) {
    var clonedBtn = baseBtn.clone();
    clonedBtn.attr("id", null);
    clonedBtn.attr("href", null);
        
    if (!isEditor) {
        clonedBtn.attr("title", button.hint);
        clonedBtn.css("color", button.color);
        clonedBtn.click(function() { onButtonClick(edit, button.name, true, false); });
        clonedBtn.html(button.title);
    } else {
        var editorBtnLink = clonedBtn.first();
        editorBtnLink.html(button.title);
        editorBtnLink.attr("title", button.hint);
        editorBtnLink.css("color", button.color);
        editorBtnLink.click(function() { onButtonClick(edit, button.name, false, true); });
        clonedBtn.css("padding-left", "4px");
        clonedBtn.css("padding-right", "4px");
    }
    
    return clonedBtn;
}

function createRow(rowBase, title, text, id) {
	var clone = rowBase.clone().attr("id", null);
	clone.removeClass("description");
	clone.css("height", "32px");
	clone.children("dt").text(title);
	clone.children("dd").attr("id", id).removeClass("empty").html(text);
	return clone;
}

function onButtonClick(newCommentEdit, name, isScroll, insert) {
    var textToAdd = name + " ";
    var currentText = newCommentEdit.val();
    if (isScroll) {
        var clickedFirstTime = false;
        $('html, body').animate({
            scrollTop: newCommentEdit.offset().top
        }, 250);
    }

    //Fix textarea focus
    newCommentEdit.focus(); 
   if (currentText.indexOf(textToAdd) === -1) {
        newCommentEdit.val(insert ? textToAdd + currentText : textToAdd);
        newCommentEdit.focusin(function () {
            if (!clickedFirstTime) {
                clickedFirstTime = true;
                var val = newCommentEdit.val();
                newCommentEdit.val("").val(val);
            }
        });
    }
}

function checkIfRequestAuthor() {
    var myName = $("#profile-link").attr("href");
    var author = $(".author .participants a").attr("href");
    
    return myName === author;
}

function checkForPRUrl() {
    var pathname = window.location.pathname;
    return pathname.indexOf("/pull-request/") > -1;
}

function checkForPRDashBoardUrl() {
    var pathname = window.location.pathname;
    return pathname.indexOf("/pullrequests") > -1 || pathname.indexOf("/pull-requests") > -1;
}

//CHROME EXTENSION SPECIFIC, AJAX ROUTING
if (typeof CHROME !== "undefined" && CHROME) {
	var chromeMain = function() {

		jQuery(document).ajaxComplete(function(event,request, settings){
			var newEvent = new CustomEvent("AjaxCompletedEvent", {"detail": settings.url});
			document.body.dispatchEvent(newEvent);
		});

	};

	//Insert code
	var embeddedScript = document.createElement("script");
	embeddedScript.type = "text/javascript";
	embeddedScript.text = '('+ chromeMain +')("");';
	(document.body || document.head).appendChild(embeddedScript);

	document.body.addEventListener("AjaxCompletedEvent", function(e) {
		checkForDasboard(e.detail);
	});
}