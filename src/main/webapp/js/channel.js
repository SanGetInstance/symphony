/*
 * Copyright (c) 2012-2016, b3log.org & hacpai.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Message channel via WebSocket.
 *
 * @author <a href="http://88250.b3log.org">Liang Ding</a>
 * @author <a href="http://vanessa.b3log.org">Liyuan Li</a>
 * @version 1.9.9.11, Aug 17, 2016
 */

/**
 * @description Article channel.
 * @static
 */
var ArticleChannel = {
    /**
     * WebSocket instance.
     * 
     * @type WebSocket
     */
    ws: undefined,
    /**
     * @description Initializes message channel
     */
    init: function (channelServer) {
        ArticleChannel.ws = new ReconnectingWebSocket(channelServer);
        ArticleChannel.ws.reconnectInterval = 10000;

        ArticleChannel.ws.onopen = function () {
            setInterval(function () {
                ArticleChannel.ws.send('-hb-');
            }, 1000 * 60 * 3);
        };

        ArticleChannel.ws.onmessage = function (evt) {
            var data = JSON.parse(evt.data);

            if (Label.articleOId !== data.articleId) { // It's not the current article
                return;
            }

            switch (data.type) {
                case "comment":
                    var cmtCount = parseInt($("#comments .comment-header .ft-smaller").text()) + 1;
                    // 总帖数更新
                    $("#comments .comment-header .ft-smaller").text(cmtCount + ' ' + Label.cmtLabel);

                    // 新增第一条评论时到底部的锚点
                    var bottomCmt = '';
                    if ($('#comments > ul li').length === 0) {
                        bottomCmt = '<div id="bottomComment"></div>';
                    }

                    // ua
                    var UAName = Util.getDeviceByUa(data.commentUA);
                    if (UAName !== '') {
                        UAName = ' <span class="cmt-via">via ' + UAName + '</span>';
                    }

                    var template = '<li id="' + data.commentId + '" class="fn-none">'
                            + bottomCmt + '<div class="fn-flex">';

                    if (!data.fromClient) {
                        if (data.commentAuthorName !== 'someone') {
                            template += '<a rel="nofollow" href="/member/' + data.commentAuthorName + '">';
                        }
                        template += '<div class="avatar tooltipped tooltipped-se" aria-label="' + data.commentAuthorName + '" style="background-image:url('
                                + data.commentAuthorThumbnailURL + ')"></div>';
                        if (data.commentAuthorName !== 'someone') {
                            template += '</a>';
                        }
                    } else {
                        template += '<div class="avatar tooltipped tooltipped-se" aria-label="' + data.commentAuthorName + '" style="background-image:url('
                                + data.commentAuthorThumbnailURL + ')"></div>';
                    }

                    template += '<div class="fn-flex-1 comment-content">'
                            + '<div class="fn-clear comment-info ft-smaller">'
                            + '<span class="fn-left">';

                    if (!data.fromClient) {
                        if (data.commentAuthorName !== 'someone') {
                            template += '<a rel="nofollow" href="/member/' + data.commentAuthorName + '">';
                        }
                        template += data.commentAuthorName;
                        if (data.commentAuthorName !== 'someone') {
                            template += '</a>';
                        }
                    } else {
                        template += data.commentAuthorName + ' via <a rel="nofollow" href="https://hacpai.com/article/1457158841475">API</a>';
                    }
                    template += '<span class="ft-fade"> • ' + data.timeAgo;

                    if (data.userUAStatus === 0) {
                        template += UAName;
                    }

                    template += '</span></span><span class="fn-right ft-gray">';

                    if ((Label.isLoggedIn && data.commentAuthorName !== Label.currentUserName) || !Label.isLoggedIn) {
                        template += '<span class="fn-hidden hover-show fn-pointer ft-fade tooltipped tooltipped-n" '
                                + ' aria-label="' + Label.thankLabel + '" onclick="Comment.thank(\'' + data.commentId + '\', \'' + Label.csrfToken
                                + '\', \'' + data.commentThankLabel + '\','
                                + (data.commentAuthorName === 'someone' ? 1 : 0) + ', this)"><span class="icon-heart"></span></span> ';
                    }

                    template += '<span class="tooltipped tooltipped-n fn-pointer fn-hidden hover-show ft-fade" '
                            + 'aria-label="' + Label.upLabel + ' 0"'
                            + 'onclick="Article.voteUp(\'' + data.commentId + '\', \'comment\', this)">'
                            + '<span class="icon-thumbs-up"></span></span> '
                            + '<span class="tooltipped tooltipped-n fn-pointer fn-hidden hover-show ft-fade"'
                            + 'aria-label="' + Label.downLabel + ' 0" '
                            + 'onclick="Article.voteDown(\'' + data.commentId + '\', \'comment\', this)">'
                            + '<span class="icon-thumbs-down"></span></span> ';

                    if ((Label.isLoggedIn && data.commentAuthorName !== Label.currentUserName && data.commentAuthorName !== 'someone') || !Label.isLoggedIn) {
                        template += ' <span aria-label="@' + data.commentAuthorName + '" class="fn-pointer tooltipped tooltipped-n" onclick="Comment.replay(\'@'
                                + data.commentAuthorName + ' \')"><span class="icon-reply"></span></span> ';
                    }

                    if (Label.isAdminLoggedIn) {
                        template += '<a class="tooltipped tooltipped-n ft-a-icon" href="/admin/comment/' + data.commentId
                                + '" aria-label="' + Label.adminLabel + '"><span class="icon-setting"></span></a> ';
                    }

                    template += '<i class="ft-fade">' + cmtCount + '</i></span></div><div class="content-reset comment">'
                            + data.commentContent + '</div></div></div></li>';

                    if (0 === Label.userCommentViewMode) { // tranditional view mode
                        $("#comments > ul").append(template);
                    } else {
                        $("#comments > ul").prepend(template);
                    }

                    // 代码高亮
                    Article.parseLanguage();

                    $("#" + data.commentId).fadeIn(2000);
                    break;
                case "articleHeat":
                    var $heatBar = $("#heatBar"),
                            $heat = $(".heat");

                    if (data.operation === "+") {
                        $heatBar.append('<i class="point"></i>');
                        setTimeout(function () {
                            $heat.width($(".heat").width() + 1 * 3);
                            $heatBar.find(".point").remove();
                        }, 2000);
                    } else {
                        $heat.width($(".heat").width() - 1 * 3);
                        $heatBar.append('<i class="point-remove"></i>');
                        setTimeout(function () {
                            $heatBar.find(".point-remove").remove();
                        }, 2000);
                    }

                    break;
                default:
                    console.error("Wrong data [type=" + data.type + "]");
            }


        };

        ArticleChannel.ws.onclose = function () {
        };

        ArticleChannel.ws.onerror = function (err) {
            console.log(err);
        };
    }
};

/**
 * @description Article list channel.
 * @static
 */
var ArticleListChannel = {
    /**
     * WebSocket instance.
     * 
     * @type WebSocket
     */
    ws: undefined,
    /**
     * @description Initializes message channel
     */
    init: function (channelServer) {
        ArticleListChannel.ws = new ReconnectingWebSocket(channelServer);
        ArticleListChannel.ws.reconnectInterval = 10000;

        ArticleListChannel.ws.onopen = function () {
            setInterval(function () {
                ArticleListChannel.ws.send('-hb-');
            }, 1000 * 60 * 3);
        };

        ArticleListChannel.ws.onmessage = function (evt) {
            var data = JSON.parse(evt.data);
            $(".article-list .has-view h2 > a[rel=bookmark]").each(function () {
                var id = $(this).data('id').toString();

                if (data.articleId === id) {
                    var $li = $(this).closest("li"),
                            $heat = $li.find('.heat');

                    if (data.operation === "+") {
                        $li.append('<i class="point"></i>');
                        setTimeout(function () {
                            $heat.width($heat.width() + 1 * 3);
                            $li.find(".point").remove();
                        }, 2000);
                    } else {
                        $heat.width($heat.width() - 1 * 3);
                        $li.append('<i class="point-remove"></i>');
                        setTimeout(function () {
                            $li.find(".point-remove").remove();
                        }, 2000);
                    }
                }
            });
        };

        ArticleListChannel.ws.onclose = function () {
            ArticleListChannel.ws.close();
        };

        ArticleListChannel.ws.onerror = function (err) {
            console.log("ERROR", err);
        };
    }
};

/**
 * @description Timeline channel.
 * @static
 */
var TimelineChannel = {
    /**
     * WebSocket instance.
     * 
     * @type WebSocket
     */
    ws: undefined,
    /**
     * @description Initializes message channel
     */
    init: function (channelServer, timelineCnt) {
        TimelineChannel.ws = new ReconnectingWebSocket(channelServer);
        TimelineChannel.ws.reconnectInterval = 10000;

        TimelineChannel.ws.onopen = function () {
            setInterval(function () {
                TimelineChannel.ws.send('-hb-');
            }, 1000 * 60 * 3);
        };

        TimelineChannel.ws.onmessage = function (evt) {
            var data = JSON.parse(evt.data);

            $('#emptyTimeline').remove();

            switch (data.type) {
                case 'newUser':
                case 'article':
                case 'comment':
                case 'activity':
                    var time = new Date().getTime();
                    var template = "<li class=\"fn-none\" id=" + time + ">" + data.content + "</li>";
                    $("#ul").prepend(template);
                    $("#" + time).fadeIn(2000);

                    var length = $("#ul > li").length;
                    if (length > timelineCnt) {
                        $("#ul > li:last").remove();
                    }

                    break;
            }
        };

        TimelineChannel.ws.onclose = function () {
            TimelineChannel.ws.close();
        };

        TimelineChannel.ws.onerror = function (err) {
            console.log("ERROR", err);
        };
    }
};

/**
 * @description Char room channel.
 * @static
 */
var ChatRoomChannel = {
    /**
     * WebSocket instance.
     * 
     * @type WebSocket
     */
    ws: undefined,
    /**
     * @description Initializes message channel
     */
    init: function (channelServer) {
        ChatRoomChannel.ws = new ReconnectingWebSocket(channelServer);
        ChatRoomChannel.ws.reconnectInterval = 10000;

        ChatRoomChannel.ws.onopen = function () {
            setInterval(function () {
                ChatRoomChannel.ws.send('-hb-');
            }, 1000 * 60 * 3);
        };

        ChatRoomChannel.ws.onmessage = function (evt) {
            var data = JSON.parse(evt.data);

            switch (data.type) {
                case "online":
                    $("#onlineCnt").text(data.onlineChatCnt);
                    break;
                case "msg":
                    var enableUserLink = data.userAvatarURL.indexOf("user-thumbnail.png") < 0;
                    var avatarPart = '<a rel="nofollow" href="/member/' + data.userName + '">'
                            + '<div class="avatar tooltipped tooltipped-se" aria-label="' + data.userName
                            + '" style="background-image:url(' + data.userAvatarURL + ')"></div>'
                            + '</a>';
                    if (!enableUserLink) {
                        avatarPart = '<div class="avatar tooltipped tooltipped-se" aria-label="' + data.userName
                                + '" style="background-image:url(' + data.userAvatarURL + ')"></div>';
                    }

                    var namePart = '<a rel="nofollow" href="/member/' + data.userName + '">' + data.userName + '</a>';
                    if (!enableUserLink) {
                        namePart = data.userName;
                    }

                    var liHTML = '<li class="fn-none">'
                            + '<div class="fn-flex">'
                            + avatarPart
                            + '<div class="fn-flex-1">'
                            + '<div class="fn-clear">'
                            + '<span class="fn-left">'
                            + namePart
                            + '</span>'
                            + '</div>'
                            + '<div class="content-reset comment">'
                            + data.content
                            + '</div>'
                            + '</div>'
                            + '</div>'
                            + '</li>';
                    if ($('.form ul li').length === 0) {
                        $('.form ul').html(liHTML);
                    } else {
                        $('.form ul li:first').before(liHTML);
                    }

                    if ($('.form .list').scrollTop() < $('.form li').outerHeight() * 2) {
                        $('.form .list').animate({'scrollTop': 0}, 500);
                    }
                    $(".form ul li:first").fadeIn(2000);
                    break;
            }
        };

        ChatRoomChannel.ws.onclose = function () {
            ChatRoomChannel.ws.close();
        };

        ChatRoomChannel.ws.onerror = function (err) {
            console.log("ERROR", err);
        };
    }
};