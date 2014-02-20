/*global document: false, $: false, window: false, Worker: false, defineManager: false, QueryManager: false, popManager: false, jStat: false, FileReader: false, jQuery: false, User: false  */
"use strict";
var qmanager;
var QueryRun = false;
var worker;
var dataTable;
var resizeAll = function () {
    var header = $(".ui-tabs-nav"),
        tabs = $("#tabs"),
        windowSize = window.innerHeight,
        workspace_height,
        halfsizes;
    tabs.css("height", windowSize - 25);
    workspace_height = tabs.outerHeight() - header.outerHeight();
    workspace_height -= 15;
    $(".ui-tabs-panel").css("height", workspace_height);
    halfsizes = $(".half");
    $(".half").css("height", (workspace_height / 2) - 5);
};
var FileList = [];

function plot(columns, data) {
    var yAxis, i, d, j, column, plots = [], subscale, identifier, dataSetNo = 1, columnData = {},
        mean = data.mean(), stdev = data.stdev(), normal, showNormal = false, normals = [], min = data.min().min(), max = data.max().max(),
        NormalPlot = function (x) { return [x, normal.pdf(x)]; };
    if (document.getElementById("shownormals").checked === true) {
        showNormal = true;
    }
    for (j = 0; j < columns.length; j += 1) {
        column = columns[j].Index;
        yAxis = [];
        for (i = 0; i < data.length; i += 1) {
            identifier = data[i][0].split(',');
            subscale = identifier.pop();
            d = data[i][column];
            if (yAxis[d]) {
                yAxis[d][1] += 1;
            } else {
                yAxis[d] = [d, 1];
            }
        }
        plots.push({
            label: columns[j].Header,
            data: yAxis,
            stack: false,
            //xaxis: dataSetNo,
            lines: { show: false, steps: false },
            bars: { show: true, barWidth: 0.9, align: 'center' }
        });
        if (showNormal) {
            if (columns[j].Header) {
                normal = jStat.normal(mean[column], stdev[column]);
                normals.push({
                    label: 'Normal of ' + columns[j].Header,
                    data: jStat.seq(min, max, 101, NormalPlot),
                    //xaxis: 2,
                    yaxis: 2,
                    lines: { show: true, fill: true },
                    bars: { show: false }
                });
            }
        }
        dataSetNo += 1;
    }
    // Normals are put into a separate array and concatenated so
    // that we don't lose the order/colour of the already existing
    // fields when "show normals" is toggled
    if (showNormal) {
        plots = plots.concat(normals);
    }
    $.plot("#plotdiv", plots, {
        yaxes: [{}, { position: "right" } ]
    });
}

// Move all the stats stuff to a different file?
function populateStatsTable(headers, data) {
    var d = jStat(data),
        tbl = $("#stats"),
        thead = $("#stats thead"),
        tbody = $("#stats tbody"),
        trow,
        i,
        addStatsCol = function (header, data, i) {
                el;
            el = document.createElement('td');
            if(data[i] == null) {
                el.textContent = '.';
            }
            el.textContent = data[i];
            return el;

            /*
            trow = $('<tr><th>' + header + '</th></tr>');
            for (i = 1; i < (results.length - 1); i += 1) {
                trow.append('<td>' + results[i] + '</td>');
            }
            tbody.append(trow);
            */
        },
        quartiles,
        mean,
        cols,
        group_cols,
        xaxis,
        yaxis,
        el,
        groups, row, j;

    /*
    thead.children().remove();
    thead.append('<tr>');
    trow = $("#stats thead tr");
    trow.append('<th class="header">Measure</th>');
    for (i = 1; i < headers.length; i += 1) {
        trow.append('<th class="header">' + headers[i] + "</th>");
    }
    */

    tbody.children().remove();

    for (i = 1; i < headers.length; i += 1) {
        row = document.createElement('tr');
        el = document.createElement('td');
        el.textContent = headers[i];
        row.appendChild(el);

        row.appendChild(addStatsCol('Minimum', d.min(), i));
        row.appendChild(addStatsCol('Maximum', d.max(), i));
        row.appendChild(addStatsCol('Standard Deviation', d.stdev(), i));
        row.appendChild(addStatsCol('Mean', d.mean(), i));
        row.appendChild(addStatsCol('Mean Deviation', d.meandev(), i));
        row.appendChild(addStatsCol('Mean Squared Error', d.meansqerr(), i));

        quartiles = d.quartiles();

        // First Quartile
        el = document.createElement('td');
        el.textContent = quartiles[i][0];
        row.appendChild(el);

        // Second Quartile
        el = document.createElement('td');
        el.textContent = quartiles[i][1];
        row.appendChild(el);

        // Third Quartile
        el = document.createElement('td');
        el.textContent = quartiles[i][2];
        row.appendChild(el);



        tbody.append(row);
    }
    $("#stats").dataTable().fnGetData(),

    /*

    row.appendChild(addStatsCol('Maximum', d, d.max));
    row.appendChild(addStatsCol('Mean', d, d.mean));
    row.appendChild(addStatsCol('Standard Deviation', d, d.stdev));
    // I'm not actually sure what these mean
    row.appendChild(addStatsCol('Mean Deviation', d, d.meandev));
    row.appendChild(addStatsCol('Mean Square Error', d, d.meansqerr));

    quartiles = d.quartiles;
    for (i = 1; i < (quartiles.length - 1); i += 1) {

    }
    */

    mean = d.mean();
    cols = [];
    group_cols = [];
    for (i = 0; i < mean.length; i += 1) {
        if (!isNaN(mean[i])) {
            cols.push({ Header: headers[i], Index: i });
        } else {
            group_cols.push({ Header: headers[i], Index: i });
        }
    }
    plot(cols, d);

    // Update list of fields for scatterplot
    xaxis = document.getElementById("scatter-xaxis");
    yaxis = document.getElementById("scatter-yaxis");
    $(xaxis).children().remove();
    $(yaxis).children().remove();
    for (i = 0; i < cols.length; i += 1) {
        el = document.createElement('option');
        el.textContent = cols[i].Header;
        el.value = cols[i].Index;
        xaxis.appendChild(el);
        yaxis.appendChild(el.cloneNode(true));
    }
    groups = document.getElementById("scatter-group");
    $(groups).children().remove();
    $(groups).append("<option value=\"ungrouped\">Ungrouped</option>");
    for (i = 1; i < group_cols.length; i += 1) {
        // Start at 1, because grouping by identifier is meaningless
        el = document.createElement('option');
        el.textContent = group_cols[i].Header;
        el.value = group_cols[i].Index;
        groups.appendChild(el);
    }


}

function PopulateDataTable() {
}
function convertObjectToTable(object) {
    if (worker) {
        worker.terminate();
    }
    worker = new Worker('script/ui.tablerender.js');
    worker.postMessage({ cmd: 'ConvertObject', obj: object, group_level: document.getElementById("group_level").value, SelectedElements: defineManager.getSelectedNames()});
    var progress = document.getElementById("progress"),
        cols = 0,
        headers;

    FileList = [];

    worker.addEventListener('message', function (e) {
        var i, tbl, thead, trow, headers, headersEl, csvworker;
        if (e.data.cmd === 'Status') {
            progress.textContent = "Processed " + e.data.RowNum + " / " + e.data.Total;
        } else if (e.data.cmd === "PopulateHeaders") {
            if (dataTable && dataTable.fnClearTable) {
                dataTable.fnClearTable();
            }
            tbl = $("#data");
            thead = $("#data thead");
            thead.children().remove();
            thead.append('<tr>');
            trow = $("#data thead tr");
            cols = e.data.Headers.length;
            for (i = 0; i < cols; i += 1) {
                trow.append("<th>" + e.data.Headers[i] + "</th>");
            }
            dataTable = $("#data").dataTable({
                bJQueryUI: true,
                sPaginationType: "full_numbers",
                bDestroy: true,
                "bAutoWidth" : false,
                "sScrollX": "100%",
                /*"sScrollXInner" : "110%", */
                bScrollCollapse: true
            });
            $("#data").css('width', 'auto');
            dataTable.fnAdjustColumnSizing();
            headers = e.data.Headers;

        } else if (e.data.cmd === 'AddRow') {
            progress.textContent = ("Loading data " + e.data.RowNum + " / " + e.data.TotalRows);
            if (dataTable.fnAddData) {
                dataTable.fnAddData(e.data.Row, false);
            }
            if (e.data.RowNum === e.data.TotalRows) {
                progress.textContent = '';
                dataTable.fnDraw();
                headers = [];
                headersEl = $("#data thead th");
                for (i = 0; i < headersEl.length; i += 1) {
                    headers[i] = headersEl[i].textContent;
                }       

                populateStatsTable(headers, dataTable.fnGetData().convertNumbers());
                worker.terminate();
            }
        } else if (e.data.cmd === 'AddFile') {
            FileList.push(e.data.Filename);
        }
    }, true);
    worker.postMessage({ cmd: 'ConvertObject', obj: object, group_level: document.getElementById("group_level").value, SelectedElements: defineManager.getSelectedNames()});
}



$(document).ready(function () {
    var lsFit = function (data) {
            var i = 0, means = jStat(data).mean(),
                xmean = means[0], ymean = means[1], interim = 0,
                numerator  = 0, denominator = 0, slope, xi, yi;

            for (i = 0; i < data.length; i += 1) {
                xi = data[i][0];
                yi = data[i][1];
                numerator += (xi - xmean) * (yi - ymean);
                denominator += ((xi - xmean) * (xi - xmean));
            }

            slope = numerator / denominator;

            return [(ymean - slope * xmean), slope];
        },
        minmaxx = function (arr) {
            var i, min, max;

            for (i = 0; i < arr.length; i += 1) {
                if (arr[i][0] < min || min === undefined) {
                    if (arr[i][0] !== undefined && arr[i][0] !== null) {
                        min = arr[i][0];
                    }
                }
                if (arr[i][0] > max || max === undefined) {
                    if (arr[i][0] !== undefined && arr[i][0] !== null) {
                        max = arr[i][0];
                    }
                }
            }
            return [min, max];
        },
        updateScatterplot = function () {
            var xaxis = document.getElementById("scatter-xaxis").value,
                yaxis = document.getElementById("scatter-yaxis").value,
                grouping = document.getElementById("scatter-group").value,
                data = dataTable.fnGetData(),
                points = [],
                min,
                max,
                field1 = [],
                field2 = [],
                grouped_points = {},
                i = 0,
                group_label,
                minmax,
                LS,
                slope,
                start,
                plots = [],
                label,
                plotY = function (x) { return [x, start + (slope * x)]; },
                dataset;

            for (i = 0; i < data.length; i += 1) {
                points.push([data[i][xaxis], data[i][yaxis]]);
                field1.push(data[i][xaxis]);
                field2.push(data[i][yaxis]);
                if (grouping) {
                    group_label = data[i][grouping];
                    if (!(grouped_points[group_label] instanceof Array)) {
                        grouped_points[group_label] = [];
                    }
                    grouped_points[group_label].push([data[i][xaxis], data[i][yaxis]]);
                }
            }



            if (grouping === 'ungrouped') {
                minmax = minmaxx(points.convertNumbers());
                min = minmax[0];
                max = minmax[1];
                LS = lsFit(points.convertNumbers());
                slope = LS[1];
                start = LS[0];

                $.plot("#scatterplotdiv", [{

                    label: 'Data Points',
                    data: points,
                    points: { show: true }
                }, // Least Squares Fit
                    {
                        label: 'Least Squares Fit',
                        data: jStat.seq(min, max, 3, plotY),
                        lines: { show: true }
                    }], {});
            } else {
                minmax = minmaxx(points.convertNumbers());
                min = minmax[0];
                max = minmax[1];
                i = 0;

                for (dataset in grouped_points) {
                    if (grouped_points.hasOwnProperty(dataset)) {
                        label = document.getElementById("scatter-group").selectedOptions.item().textContent + " = " + dataset;
                        plots.push({
                            color: i,
                            label: dataset,
                            data: grouped_points[dataset],
                            points: { show: true }
                        });
                        LS = lsFit(grouped_points[dataset].convertNumbers());
                        slope = LS[1];
                        start = LS[0];
                        plots.push({
                            color: i,
                            // label: "LS Fit for " + dataset,
                            data: jStat.seq(min, max, 3, plotY),
                            lines: { show: true }
                        });
                        i += 1;
                    }
                }
                $.plot("#scatterplotdiv", plots, {});
            }

            $("#correlationtbl tbody").children().remove();
            $("#correlationtbl tbody").append("<tr><td>" + jStat.covariance(field1, field2) + "</td><td>" + jStat.corrcoeff(field1, field2) + "</td></tr>");
        };
    qmanager = new QueryManager("current_filter");
    $("#tabs").tabs();
    // Enable the logout button so that it's not greyed out.
    $("#tabs").tabs("enable", 5);
    resizeAll();
    $(window).resize(resizeAll);
    $("#shownormals").click(function () {
        // All the data is already cached, so just rerun it to
        // update the graph
        $("#runquery").click();
    });
    $("#runquery").click(function () {
        var that = qmanager;
        QueryRun = true;
        $("#ViewData").css("cursor", "progress");
        qmanager.run(function () {
            var fields = defineManager.getSelected(),
                sessions = that.getSessions(),
                field_split,
                DocTypes = [],
                i = 0,
                Fields = {},
                DataObject = {},
                CompleteBitmask = [],
                WaitForCallback = !(that.populationExplicit()),
                keys,
                sessionsIdx,
                merged,
                create_callback = function (DocType, docidx, maxdocidx, callback) {
                    return function (data, textStatus) {
                        var i = 0,
                            j = 0,
                            row,
                            elements = Fields[DocType],
                            group_level = document.getElementById("group_level").value,
                            prefix,
                            Completed,
                            FieldName;
                        for (i = 0; i < data.rows.length; i += 1) {
                            row = data.rows[i];
                            prefix = row.value.clone();
                            j = group_level;
                            while (j > 0) {
                                j -= 1;
                                prefix.pop();
                            }
                            if (sessions.containsPrefix(prefix)) {
                                for (j = 0; j < elements.length; j += 1) {
                                    if (!DataObject[row.value]) {
                                        DataObject[row.value] = [];
                                    }

                                    FieldName = row.key[0] + "," + elements[j];

                                    if (row.doc.data && row.doc.data[elements[j]] !== null) {
                                        DataObject[row.value][FieldName] = {
                                            TextValue: row.doc.data[elements[j]],
                                            IsFile: false,
                                            DocID: row.id
                                        }
                                    } else {
                                        DataObject[row.value][FieldName] = {
                                            TextValue: '.',
                                            IsFile: false,
                                            DocID: row.id
                                        }
                                    }

                                    if(defineManager.isFileField([DocType, elements[j]])) {
                                        DataObject[row.value][FieldName].IsFile = true;
                                    }
                                }
                            }
                        }
                        CompleteBitmask[docidx] = true;
                        Completed = true;
                        for (i = 0; i < maxdocidx; i += 1) {
                            if (CompleteBitmask[i] !== true) {
                                Completed = false;
                            }
                        }

                        if (callback && Completed) {
                            callback(convertObjectToTable(DataObject));
                            $("#ViewData").css("cursor", "auto");
                        }

                    };
                };
            for (i = 0; i < fields.length; i += 1) {
                field_split = $(fields[i]).children(".queryField")[0].textContent.split(",");
                DocTypes.push(field_split[0]);
                if (Fields[field_split[0]] === undefined) {
                    Fields[field_split[0]] = [];
                }
                Fields[field_split[0]].push(field_split[1]);
            }

            DocTypes = DocTypes.unique();

            for (i = 0; i < DocTypes.length; i += 1) {
                keys = [];
                for (sessionsIdx = 0; sessionsIdx < sessions.length; sessionsIdx += 1) {
                    merged = [];
                    merged.push(DocTypes[i]);
                    merged = merged.concat(sessions[sessionsIdx]);

                    keys.push(merged);
                }

                $.ajax({
                    type: "POST",
                    url: "_view/instruments?include_docs=true&reduce=false",
                    data: JSON.stringify({ 'keys' : keys }),
                    success: create_callback(DocTypes[i], i, DocTypes.length, PopulateDataTable),
                    contentType: 'application/json',
                    dataType: 'json'
                });
            }
            document.getElementById("current_sessions").textContent = "[" + sessions.join("], [") + "]";
            $("a[href='#ViewData']").fadeTo('fast', 0.25);
            $("a[href='#ViewData']").fadeTo('slow', 1);
        });
    });
    $("#UploadPopulation").change(function (e) {
        var file = e.target.files[0],
            reader = new FileReader();
        reader.onload = function (data) {
            var lines = data.target.result.replace(/\r/g, '').split("\n"),
                tabDelimited = lines[0].split("\t"),
                commaDelimited = lines[0].split(","),
                delimiter = '\t',
                population = [],
                i = 0;

            if (commaDelimited.length >= tabDelimited.length) {
                delimiter = ',';
            }
            for (i = 0; i < lines.length; i += 1) {
                if (lines[i] !== '') {
                    population.push(lines[i].split(delimiter));
                }

            }

            qmanager.setPopulation(population);
        };
        reader.readAsText(file);
    });
    $("#addAll").click(function () {
        var fields = document.getElementById("fields"),
            allElements = $(fields).children("tbody").children(),
            curEl,
            i;
        for (i = 0; i < allElements.length; i += 1) {
            curEl = allElements[i];
            if (!($(curEl).hasClass("selected"))) {
                defineManager.add(curEl);
            }
        }
        //popManager.toggle(document.getElementById(selected[i]));
    });
    $("#removeAll").click(function () {
        var fields = document.getElementById("fields"),
            allElements = $(fields).children("tbody").children(),
            curEl,
            i;
        for (i = 0; i < allElements.length; i += 1) {
            curEl = allElements[i];
            if ($(curEl).hasClass("selected")) {
                defineManager.remove(curEl);
            }
        }
    });

    $("#scatter-xaxis").change(updateScatterplot);
    $("#scatter-yaxis").change(updateScatterplot);
    $("#scatter-group").change(updateScatterplot);

    // HTML tooltips courtesy of Tarek
    $(".html_tool_tip_trigger").live("mouseenter", function (event) {
        var trigger = jQuery(this),
            tool_tip_id = trigger.attr("data-tool-tip-id"),
            tool_tip = jQuery("#" + tool_tip_id),
            offset_x = trigger.attr("data-offset-x") || '30',
            offset_y = trigger.attr("data-offset-y") || '0',
            x,
            y;

        if ((tool_tip.css('top') === '' || tool_tip.css('top') === '0px')
                && (tool_tip.css('left') === '' || tool_tip.css('left') === '0px')) {
            x = trigger.position().left + parseInt(offset_x, 10);
            y = trigger.position().top  + parseInt(offset_y, 10);

            tool_tip.css('top',  y + 'px');
            tool_tip.css('left', x + 'px');
        }

        tool_tip.show();
    }).live("mouseleave", function (event) {
        var trigger = jQuery(this),
            tool_tip_id = trigger.attr("data-tool-tip-id"),
            tool_tip = jQuery("#" + tool_tip_id);

        tool_tip.hide();
    });

    // User login/logout
    window.user = new User();

    $("#loginbutton").click(function () {
        window.user.login(
            document.getElementById("username_form").value,
            document.getElementById("password_form").value
        );
        return false;

    });
    $("#SaveQuery").click(function () {
        $("#SaveDialog").dialog("open");
    });
    $.getJSON("/_session", function (data) {
        if (data.userCtx && data.userCtx.name) {
            window.user._cookieLogin(data.userCtx.name);

            Categories.list("categories");
            Categories.list("categories_pop");
        } else {
            if(window.user._explicitLogout !== true) {
                window.user.logout();
            }
        }
    });

    window.user._loadSavedQueries = function (data) {
        var saved = document.getElementById("savedqueries"),
            tblEl,
            tblRow,
            btn,
            i,
            row,
            j,
            label,
            body = saved.querySelector("tbody");
        $("#savedqueries").dataTable().fnDestroy();
        body.textContent = '';
        for (i = 0; i < data.length; i += 1) {
            row = data[i];
            tblRow = document.createElement("tr");

            // Actions
            tblEl  = document.createElement("td");
            btn = document.createElement("button");
            btn.textContent = "Load";
            $(btn).click(function (row, tblRow) {
                return function () {
                    var i = 0, el, cell, addedEl;
                    /* Load fields */
                    defineManager.clear();
                    for (i = 0; i < row.Fields.length; i += 1) {
                        console.log(row.Fields[i]);
                        defineManager.add(row.Fields[i]);
                    }
                    $("a[href='#DefineFields']").fadeTo('fast', 0.25);
                    $("a[href='#DefineFields']").fadeTo('slow', 1);


                    /* Load conditions */
                    popManager.clear();
                    for (i = 0; i < row.Conditions.length; i += 1) {
                        el = document.createElement("tr");
                        el.classList.add("selectable");
                        cell = document.createElement("td");
                        cell.textContent = row.Conditions[i].Field;
                        el.appendChild(cell);

                        cell = document.createElement("td");
                        cell.textContent = "";
                        el.appendChild(cell);
                        addedEl = popManager.add(el, row.Conditions[i].Value);
                        $(addedEl).children(".queryOp").val(row.Conditions[i].Operator);
                    }
                    $("a[href='#DefinePopulation']").fadeTo('fast', 0.25);
                    $("a[href='#DefinePopulation']").fadeTo('slow', 1);
                    Categories.list("categories");
                    Categories.list("categories_pop");
                };
            }(row, tblRow));
            tblEl.appendChild(btn);
            btn = document.createElement("button");
            btn.textContent = "Delete";
            $(btn).click(function (row, tblRow) {
                return function () {
                    var del = document.getElementById("deletequery");

                    del.textContent = row._id;
                    del.setAttribute("data-rev", row._rev);
                    $("#DeleteDialog").dialog("option", "Row", tblRow);

                    $("#DeleteDialog").dialog("open");
                };
            }(row, tblRow));
            tblEl.appendChild(btn);
            tblRow.appendChild(tblEl);



            // Name
            tblEl = document.createElement("td");
            tblEl.textContent = row._id;
            tblRow.appendChild(tblEl);

            // Fields
            tblEl = document.createElement("td");
            for (j = 0; row.Fields && j < row.Fields.length; j += 1) {
                tblEl.appendChild(document.createTextNode(row.Fields[j]));
                tblEl.appendChild(document.createElement("br"));
            }
            tblRow.appendChild(tblEl);

            // Conditions
            tblEl = document.createElement("td");
            for (j = 0; j < row.Conditions.length; j += 1) {
                label = '';
                label += row.Conditions[j].Field;
                label += row.Conditions[j].Operator;
                label += row.Conditions[j].Value;
                tblEl.appendChild(document.createTextNode(label));
                tblEl.appendChild(document.createElement("br"));
            }
            tblRow.appendChild(tblEl);

            body.appendChild(tblRow);

        }
        $("#savedqueries").dataTable({
            bJQueryUI: true,
            bAutoWidth: false,
            sPaginationType: "full_numbers",
            bDestroy: true,
            "oLanguage" : {
                "sZeroRecords" : "No saved queries found."
            }
        });
        // This doesn't really belong in _loadSavedQueries, but putting
        // it here is the easiest way to ensure it gets called regardless
        // of if login happened through a cookie or through entering 
        // username/password
        $.ajax({
                    type: "GET",
                    url: "_view/runlog?reduce=false&limit=1&descending=true",
                    /* data: JSON.stringify({ 'keys' : keys }),*/
                    success: function(resp) {
                        var el = document.getElementById("updatetime");

                        if(resp.rows[0]) {
                        el.textContent = new Date(resp.rows[0].key);
                        }
                    },
                    contentType: 'application/json',
                    dataType: 'json'
                }

              );
    };
    $("#DeleteDialog").dialog({
        autoOpen: false,
        modal: true,
        buttons: [
            {
                text: "Confirm delete",
                click: function () {
                    var ele = document.getElementById("deletequery"),
                        tblRow = $(this).dialog("option", "Row");
                    qmanager.deleteQuery(ele.textContent, ele.getAttribute("data-rev"));

                    $("#savedqueries").dataTable().fnDestroy();
                    $(tblRow).remove();

                    $("#savedqueries").dataTable({
                        "oLanguage": {
                            "sZeroRecords" : "No saved queries found."
                        },
                        bJQueryUI: true,
                        sPaginationType: "full_numbers",
                        bDestroy: true
                    });
                    $(this).dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function () {
                    $(this).dialog("close");
                }
            }
        ]

    });
    $("#SaveDialog").dialog({
        autoOpen: false,
        modal: true,
        buttons: [
            {
                text: "Save query",
                click: function () {
                    var el = document.getElementById("SaveDialogName"), error = document.getElementById("SaveDialogError");
                    error.textContent = '';

                    if (el === undefined || el.value === '') {
                        error.textContent = "A name must be provided for the saved query.";
                    } else {
                        qmanager.saveQuery(el.value, window.user.getSavedQueries);
                        $("a[href='#Home']").fadeTo('fast', 0.25);
                        $("a[href='#Home']").fadeTo('slow', 1);
                        // Reload the saved queries, because
                        // it's fast enough and easier than
                        // reparsing everything.
                        //window.user.getSavedQueries();
                        $(this).dialog("close");
                    }
                }
            },
            {
                text: "Cancel",
                click: function () {
                    $(this).dialog("close");
                }
            }
        ]
    });
    $("#SaveCSV").click(function() {
        var headers = [], i,
        headersEl = $("#data thead th"),
        csvworker = new Worker('script/ui.savecsv.js');

        for (i = 0; i < headersEl.length; i += 1) {
            headers[i] = headersEl[i].textContent;
        }

        csvworker.addEventListener('message', function (e) {
            var dataURL, link;
            if (e.data.cmd === 'SaveCSV') {
                dataURL = window.URL.createObjectURL(e.data.message);
                link = document.getElementById("DownloadLink");
                link.download = "data.csv";
                link.type = "text/csv";
                link.href = dataURL;
                $(link)[0].click();
                //window.URL.revokeObjectURL(dataURL);

            }
        });
        csvworker.postMessage({ cmd: 'SaveFile',
            data: $("#data").dataTable().fnGetData(),
            headers: headers
        });



    });
    $("#SaveZip").click(function() {
        var zip = new JSZip(), 
            i = 0, 
            CompleteMask = new Array(FileList.length),
            saveworker;
    
        saveworker = new Worker('script/ui.savezip.js');
        saveworker.addEventListener('message', function (e) {
            var dataURL = window.URL.createObjectURL(e.data.zip),
                link = document.getElementById("DownloadLink");
            link.download = "files.zip";
            link.type = "application/zip";
            link.href = dataURL;
            $(link)[0].click();
            //window.URL.revokeObjectURL(dataURL);
            
            this.terminate();
        });

        saveworker.postMessage({ Files: FileList });

        // Get list of files. Need helper function/
        // data structure for this?
        //
        // make ajax call to retrieve each file.
        // for each one 
        //    call zip.file(filename, content)
        //
        // Maybe do this in batches?
        // .. then save
    });
});
