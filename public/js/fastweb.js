  // var ace = require("/js/ace/ace");
var jadeeditor = ace.edit("jade");
var styluseditor = ace.edit("stylus");
var jseditor = ace.edit("js");


jadeeditor.setTheme("ace/theme/tomorrow");
jadeeditor.getSession().setMode("ace/mode/jade");

styluseditor.setTheme("ace/theme/tomorrow");
styluseditor.getSession().setMode("ace/mode/stylus");

jseditor.setTheme("ace/theme/tomorrow");
jseditor.getSession().setMode("ace/mode/javascript");

var sio = io.connect(), socket = sio.socket.of('/sock');

socket.on('refresh', function (data) {
    console.log(data); 
    var obj = JSON.parse(data); 
    if(obj.html) {
    	console.log(obj.html);  
        $('#content').attr({srcdoc:obj.html});
    }
    if(obj.ok_jade) {
    	$('#jade-error').text("");
    }
    if(obj.ok_stylus) {
    	$('#stylus-error').text("");
    }

    if(obj.err_jade) {
    	console.log(obj.err_jade);
    	$('#jade-error').text(obj.err_jade);
    }
    if(obj.err_stylus) {
    	console.log(obj.err_stylus);
    	$('#stylus-error').text(obj.err_stylus);
    }
});

var jadeNeedRefresh=true;
var stylusNeedRefresh=true;
var jsNeedRefresh=true;
var timer = setInterval(function () {
	if(jadeNeedRefresh) { 
		socket.send(JSON.stringify({ 
            "file": 'jade', 
            "value": jadeeditor.getSession().getValue() 
        }));
		jadeNeedRefresh=false;
	}
	if(stylusNeedRefresh) { 
		socket.send(JSON.stringify({ 
            "file": 'stylus', 
            "value": styluseditor.getSession().getValue() 
        }));
		stylusNeedRefresh=false;
	}
	if(jsNeedRefresh) {
		socket.send(JSON.stringify({ 
            "file": 'js', 
            "value": jseditor.getSession().getValue()
        }));
		jsNeedRefresh=false;
	}
}, 2000); 

jadeeditor.getSession().on('change', function(e) {
    jadeNeedRefresh=true;
});

styluseditor.getSession().on('change', function(e) {
    stylusNeedRefresh=true;
});

jseditor.getSession().on('change', function(e) {
    jsNeedRefresh=true;
});

var swPreview=true
var swEditor=true
var swJade=true
var swStylus=true
var swJS=true

$("#preview").click(function() {
	$("#container").toggle();
	if(swPreview) {
		$("#sidebar").css("left", "0px");
		$("#sidebar").css("width", "100%");
		$(this).css("font-style", "italic");
		swPreview=false;
	} else {
		$("#sidebar").css("left", "");
		$("#sidebar").css("width", "400px");
		$(this).css("font-style", "normal");
		swPreview=true;
	}
	jadeeditor.resize();
	styluseditor.resize();
	jseditor.resize();
});

$("#editor").click(function() {
	$("#sidebar").toggle();
	if(swEditor) {
		$("#container").css("right", "0px");
		$(this).css("font-style", "italic");
		swEditor=false;
	} else {
		$("#container").css("right", "401px");
		$(this).css("font-style", "normal");
		swEditor=true;
	}
});

$(".panel h3").click(function() {
	var this_editor = $(this).parent().children(".editor")
	this_editor.toggle();

	var totalEditorSize = $("#sidebar").height()-($(".panel h3").outerHeight()*3)-7;
	var numOfVisibleEditors = $(".editor:visible").length;

	$(".editor:visible").each(function() {
		$(this).css("height", (totalEditorSize/numOfVisibleEditors)+'px');
	});

	jadeeditor.resize();
	styluseditor.resize();
	jseditor.resize();
});

$(window).resize(function() {
	var totalEditorSize = $("#sidebar").height()-($(".panel h3").outerHeight()*3)-7;
	var numOfVisibleEditors = $(".editor:visible").length;

	$(".editor:visible").each(function() {
		$(this).css("height", (totalEditorSize/numOfVisibleEditors)+'px');
	});

	jadeeditor.resize();
	styluseditor.resize();
	jseditor.resize();
});


