HICHAT.namespace("HICHAT.viewer");
HICHAT.viewer = (function($, window) {
	var eventProcessor = HICHAT.utils.eventProcessor,
		service = HICHAT.service,
		User = HICHAT.model.User,
		VCard = HICHAT.model.VCard,
		Room = HICHAT.model.Room,
		RoomUser = HICHAT.model.RoomUser,
		RoomConfig = HICHAT.model.RoomConfig,
		privacyChatPanels = {},
		groupChatPanels = {},
		vCardPanels = {},
		wasteChatPanels = {},
		mainDiv = $("#mainDiv"),
		loginDiv = $("#loginDiv"),
		rosterTb = $("#rosterTb"),
		chatTabs = $("#chatTabs"),
		chatTabUl = $("#chatTabUl"),
		chatTabContent = $("#chatTabContent"),
		vCardDialog = $("#vCardDialog"),
		subscribeDialog = $("#subscribeDialog"),
		createRoomDialog = $("#createRoomDialog"),
		findRoomDialog = $("#findRoomDialog"),
		joinRoomDialog = $("#joinRoomDialog"),
		outcastDialog = $("#outcastDialog"),
		groupUserContextMenu = $("#groupUserContextMenu"),
		groupConfigContextMenu = $("#groupConfigContextMenu"),
		__initOutcastDialog = function() {
			outcastDialog.dialog({
				autoOpen: false,
				closeOnEscape: true,
				draggable: true,
				resizable: false,
				modal: false,
				width: 800,
				title: "黑名单管理",
				show: "fade",
				hide: "fade",
				buttons: [{
						text: "刷新",
						click: function(event) {
							eventProcessor.triggerEvent("service_groupChat_getOutcastList", [groupConfigContextMenu.data("roomJid")]);
						}
					}
				]
			});
		},
		__initGroupConfigContextMenu = function() {
			groupConfigContextMenu.mouseleave(function(event) {
				groupConfigContextMenu.fadeOut();
			}).click(function(event) {
				groupConfigContextMenu.fadeOut();
			});
			$("li[name='changeConfig']", groupConfigContextMenu).click(function(event) {});
			$("li[name='getOutcastList']", groupConfigContextMenu).click(function(event) {
				eventProcessor.triggerEvent("service_groupChat_getOutcastList", [groupConfigContextMenu.data("roomJid")]);
			});
			$("li[name='deleteRoom']", groupConfigContextMenu).click(function(event) {
				eventProcessor.triggerEvent("service_groupChat_deleteRoom", [groupConfigContextMenu.data("roomJid")]);
			});
			$("li[name='changeNickname']", groupConfigContextMenu).click(function(event) {
				__prompt("请输入要更改的昵称:", function(str){
					eventProcessor.triggerEvent("service_groupChat_changeNickInRoom", [groupConfigContextMenu.data("roomJid"), str]);
				}, function(str){
					return;
				});
			});
			$("li[name='changeStatus']", groupConfigContextMenu).click(function(event) {
				eventProcessor.triggerEvent("service_groupChat_changeStatusInRoom", [groupConfigContextMenu.data("roomJid")]);
			});
		},
		__showGroupConfigContextMenu = function(selfAffailiation, roomJid, left, top) {
			$("li", groupConfigContextMenu).show();
			if (selfAffailiation !== 'owner') {
				$("li[affiliation='owner']", groupConfigContextMenu).hide();
			}
			if (selfAffailiation !== 'admin' && selfAffailiation !== 'owner') {
				$("li[affiliation='admin']", groupConfigContextMenu).hide();
			}
			groupConfigContextMenu.data("roomJid", roomJid).css("left", left + "px").css("top", top - groupConfigContextMenu.height() + "px").fadeIn();
		},
		__initGroupUserContextMenu = function() {
			groupUserContextMenu.mouseleave(function(event) {
				$(this).fadeOut();
			}).click(function(event) {
				$(this).fadeOut();
			});
			$("li[name='admin']", groupUserContextMenu).click(function(event) {
				eventProcessor.triggerEvent("service_groupChat_setRoomAdmin", [groupUserContextMenu.data("userJid"), groupUserContextMenu.data("roomJid")]);
			});
			$("li[name='owner']", groupUserContextMenu).click(function(event) {
				eventProcessor.triggerEvent("service_groupChat_setRoomOwner", [groupUserContextMenu.data("userJid"), groupUserContextMenu.data("roomJid")]);
			});
			$("li[name='member']", groupUserContextMenu).click(function(event) {
				eventProcessor.triggerEvent("service_groupChat_setRoomMember", [groupUserContextMenu.data("userJid"), groupUserContextMenu.data("roomJid")]);
			});
			$("li[name='none']", groupUserContextMenu).click(function(event) {
				eventProcessor.triggerEvent("service_groupChat_setRoomVisitor", [groupUserContextMenu.data("userJid"), groupUserContextMenu.data("roomJid")]);
			});
			$("li[name='kickout']", groupUserContextMenu).click(function(event) {
				eventProcessor.triggerEvent("service_groupChat_kickout", [groupUserContextMenu.data("userJid"), groupUserContextMenu.data("roomJid")]);
			});
			$("li[name='outcast']", groupUserContextMenu).click(function(event) {
				__prompt("确定要将" + groupUserContextMenu.data("userJid") + "用户加入黑名单中？若需要加入，填入您将其加入黑名单的理由", function(reason) {
					eventProcessor.triggerEvent("service_groupChat_outcast", [groupUserContextMenu.data("userJid"), groupUserContextMenu.data("roomJid"), reason]);
				}, function(reason) {
					return;
				});
			});
		},
		__showGroupUserContextMenu = function(userAffiliation, selfAffailiation, idArgs, left, top) {
			$("li", groupUserContextMenu).show();
			if (selfAffailiation !== 'owner' && selfAffailiation !== 'admin') {
				return;
			}
			if (selfAffailiation !== "owner") {
				$("li[affiliation='owner']", groupUserContextMenu).hide();
			}
			groupUserContextMenu.data(idArgs).css("left", left + "px").css("top", top - groupUserContextMenu.height() + "px").fadeIn();
		},
		__drawRoomUser = function(roomUser) {
			var content = groupChatPanels[roomUser.toRoomString()].content,
				liNode;
			if (typeof content !== "undefined") {
				if ($(".u-mdu ul li[uid='" + roomUser.toString() + "']", content).length !== 0) {
					$(".u-mdu ul li[uid='" + roomUser.toString() + "']", content).remove();
				}
				if (roomUser.getAffiliation() === 'owner') {
					liNode = $("<li>" + roomUser.getNickname() + "(创建人)" + "</li>");
				} else if (roomUser.getAffiliation() === 'admin') {
					liNode = $("<li>" + roomUser.getNickname() + "(管理员)" + "</li>");
				} else if (roomUser.getAffiliation() === 'member') {
					liNode = $("<li>" + roomUser.getNickname() + "(会员)" + "</li>");
				} else {
					liNode = $("<li>" + roomUser.getNickname() + "(游客)" + "</li>");
				}
				liNode.attr('uid', roomUser.toString()).data({
					affiliation: roomUser.getAffiliation(),
					roomJid: roomUser.toRoomString(),
					uid: roomUser.toString()
				}).click(function(event) {
					var that = $(this),
						uid = that.data("uid"),
						affiliation = that.data("affiliation"),
						roomJid = that.data("roomJid"),
						selfUser = service.getSelfInRoom(roomJid),
						left = event.pageX,
						top = event.pageY;
					__showGroupUserContextMenu(affiliation, selfUser.getAffiliation(), {
						roomJid: roomJid,
						userJid: uid,
						selfJid: selfUser.toString()
					}, left, top);
					event.stopPropagation();
					event.preventDefault();
					return false;
				}).contextmenu(function(event) {
					var that = $(this),
						uid = that.data("uid"),
						affiliation = that.data("affiliation"),
						roomJid = that.data("roomJid"),
						selfUser = service.getSelfInRoom(roomJid),
						left = event.pageX,
						top = event.pageY;
					__showGroupUserContextMenu(affiliation, selfUser.getAffiliation(), {
						roomJid: roomJid,
						userJid: uid,
						selfJid: selfUser.toString()
					}, left, top);
					event.stopPropagation();
					event.preventDefault();
					return false;
				});
				$(".u-mdu ul", content).append(liNode);
				$(".u-mdu .u-mc").text("当前在线" + $(".u-mdu ul li", content).length + "人");

			}
		},
		__deleteRoomUser = function(roomUser) {
			var content = groupChatPanels[roomUser.toRoomString()].content;
			if (typeof content !== "undefined") {
				$(".u-mdu ul li[uid='" + roomUser.toString() + "']", content).remove();
				$(".u-mdu .u-mc").text("当前在线" + $(".u-mdu ul li", content).length + "人");
			}
		},
		__drawRoomChatTab = function(room) {
			var index = room.toString(),
				newTab,
				newContent,
				chatPanel,
				chatTextArea,
				sendBtn,
				sendTextArea,
				sendDiv,
				groupMemberDiv,
				closeChatPanelSpan,
				dropupDiv,
				memberUl,
				members,
				i,
				m;

			if (typeof groupChatPanels[index] === "undefined") {
				groupChatPanels[index] = {
					messageQueue: []
				};
			}

			if (typeof groupChatPanels[index].content === "undefined") {
				if (typeof wasteChatPanels[index] === "undefined") {
					newTab = $("<li><a href='#chatPanel_" + room.getRoomId() + "_" + room.getGroupChatResource() + "_" + room.getDomain() + "'>" + room.getRoomName() + "<span><img src='resources/closeChatPanelIcon.png'></span></a></li>");
					chatTabUl.append(newTab);
					chatTextArea = $("<div class='u-cta alert'><table><thead></thead><tbody></tbody></table></div>").css("max-height", $("body").height() - 180 + "px");
					sendTextArea = $("<textarea></textarea>").bind("keypress", function(event) {
						if (event.ctrlKey && event.which === 13 || event.which === 10) {
							$(".u-sbtn", $(this).parent()).trigger("click");
						}
					});
					sendBtn = $("<button class='btn btn-success u-sbtn'>发送</button>").data("room", room).bind("click", function(event) {
						var room = $(this).data("room"),
							msgBody = $("textarea", $(this).parent()).val();
						eventProcessor.triggerEvent("service_groupChat_groupSendMsg", [room, msgBody]);
						$("textarea", $(this).parent()).focus().val("");
					});

					memberUl = $("<ul class='dropdown-menu pull-right' roomJid='" + index + "'></ul>");
					dropupDiv = $("<div style='margin-left:50px' class='u-mdu'></div>")
						.data("member", 0)
						.addClass("btn-group dropup")
						.append("<button class='btn btn-success u-mc'></button>")
						.append("<button class='btn btn-success dropdown-toggle' data-toggle='dropdown' style='padding:5px 12px 11px 12px'><span class='caret'></span></button>")
						.append(memberUl);
					$(".u-mc", dropupDiv).data({
						roomJid: index,
						selfAffailiation: service.getSelfInRoom(index).getAffiliation()
					}).click(function(event) {
						var that = $(this),
							roomJid = that.data("roomJid"),
							selfAffailiation = that.data("selfAffailiation"),
							left = event.pageX,
							top = event.pageY;
						__showGroupConfigContextMenu(selfAffailiation, roomJid, left, top);
						event.stopPropagation();
						event.preventDefault();
						return false;
					}).contextmenu(function(event) {
						var that = $(this),
							roomJid = that.data("roomJid"),
							selfAffailiation = that.data("selfAffailiation"),
							left = event.pageX,
							top = event.pageY;
						__showGroupConfigContextMenu(selfAffailiation, roomJid, left, top);
						event.stopPropagation();
						event.preventDefault();
						return false;
					});

					sendDiv = $("<div class='u-sd s-sd'></div>").append(sendTextArea).append(sendBtn).append(dropupDiv);
					chatPanel = $("<div class='m-cp'></div>").css("height", $("body").height() - 80 + "px").append(chatTextArea).append(sendDiv);
					newContent = $("<div id='chatPanel_" + room.getRoomId() + "_" + room.getGroupChatResource() + "_" + room.getDomain() + "'></div>").append(chatPanel);
					chatTabs.append(newContent);
					chatTabs.tabs("refresh");
					$("a", newTab).trigger("click");
					$("img", newTab).click(function(event) {
						__deleteRoomChatTab(room);
						eventProcessor.triggerEvent("service_groupChat_leaveRoom", [room]);
						event.stopPropagation();
					});
					groupChatPanels[index].tab = newTab;
					groupChatPanels[index].content = newContent;

					members = room.getCurUsers();
					for (i in members) {
						if (Object.prototype.hasOwnProperty.apply(members, [i])) {
							__drawRoomUser(members[i]);
						}
					}
				} else {
					groupChatPanels[index].tab = wasteChatPanels[index].tab.fadeIn();
					groupChatPanels[index].content = wasteChatPanels[index].content.fadeIn();
					delete wasteChatPanels[index].tab;
					delete wasteChatPanels[index].content;
					delete wasteChatPanels[index];
				}
			} else {
				$("a", groupChatPanels[index].tab).tab('show');
			}
			for (i = 0, m = groupChatPanels[index].messageQueue.length; i < m; i++) {
				__printPrivacyMsg(
					user,
					groupChatPanels[index].messageQueue[i].msgBody,
					groupChatPanels[index].messageQueue[i].type);
			}
			/*$("tr[jid='" + user.getJid() + "_" + user.getDomain() + "'] .msgCount", rosterTb).hide();*/

		},
		__deleteRoomChatTab = function(room) {
			var index = room;
			if (typeof room !== 'string') {
				index = room.toString();
			}
			if (typeof groupChatPanels[index] !== "undefined") {
				wasteChatPanels[index] = {};
				wasteChatPanels[index].tab = groupChatPanels[index].tab;
				wasteChatPanels[index].content = groupChatPanels[index].content;
				delete groupChatPanels[index].tab;
				delete groupChatPanels[index].content;
				wasteChatPanels[index].tab.fadeOut();
				wasteChatPanels[index].content.fadeOut();
			}
		},
		__destoryRoomChatTab = function(room) {
			var index = room;
			if (typeof index !== 'string') {
				index = room.toString();
			}
			groupChatPanels[index].tab.remove();
			groupChatPanels[index].content.remove();
			delete groupChatPanels[index].tab;
			delete groupChatPanels[index].content;
			delete groupChatPanels[index];
		},
		__createTab = function(user, nickname) {
			var index = user.toString(),
				newTab,
				newContent,
				chatPanel,
				chatTextArea,
				sendBtn,
				sendTextArea,
				sendDiv,
				closeChatPanelSpan,
				i,
				m;

			if (typeof privacyChatPanels[index] === "undefined") {
				privacyChatPanels[index] = {
					messageQueue: []
				};
			}

			if (typeof privacyChatPanels[index].content === "undefined") {
				if (typeof wasteChatPanels[index] === "undefined") {
					newTab = $("<li><a href='#chatPanel_" + user.getJid() + "_" + user.getDomain() + "'>" + nickname + "<span><img src='resources/closeChatPanelIcon.png'></span></a></li>");
					chatTabUl.append(newTab);
					chatTextArea = $("<div class='u-cta alert'><table><thead></thead><tbody></tbody></table></div>").css("max-height", $("body").height() - 180 + "px");
					sendTextArea = $("<textarea></textarea>").bind("keypress", function(event) {
						if (event.ctrlKey && event.which === 13 || event.which === 10) {
							$(".u-sbtn", $(this).parent()).trigger("click");
						}
					});
					sendBtn = $("<button class='btn btn-success u-sbtn'>发送</button>").data("user", user).bind("click", function(event) {
						var user = $(this).data("user"),
							msgBody = $("textarea", $(this).parent()).val();
						eventProcessor.triggerEvent("service_privacyChat_sendMsg", [msgBody, user]);
						$("textarea", $(this).parent()).focus().val("");
					});
					sendDiv = $("<div class='u-sd s-sd'></div>").append(sendTextArea).append(sendBtn);
					chatPanel = $("<div class='m-cp'></div>").css("height", $("body").height() - 80 + "px").append(chatTextArea).append(sendDiv);
					newContent = $("<div id='chatPanel_" + user.getJid() + "_" + user.getDomain() + "'></div>").append(chatPanel);
					chatTabs.append(newContent).tabs("refresh");
					$("a", newTab).trigger("click");
					$("img", newTab).click(function(event) {
						__deleteTab(user);
						event.stopPropagation();
					});
					privacyChatPanels[index].tab = newTab;
					privacyChatPanels[index].content = newContent;
				} else {
					privacyChatPanels[index].tab = wasteChatPanels[index].tab.fadeIn();
					privacyChatPanels[index].content = wasteChatPanels[index].content.fadeIn();
					delete wasteChatPanels[index].tab;
					delete wasteChatPanels[index].content;
					delete wasteChatPanels[index];
				}
			} else {
				$("a", privacyChatPanels[index].tab).trigger("click");
			}
			for (i = 0, m = privacyChatPanels[index].messageQueue.length; i < m; i++) {
				__printPrivacyMsg(
					user,
					privacyChatPanels[index].messageQueue[i].msgBody,
					privacyChatPanels[index].messageQueue[i].type);
			}
			$("tr[jid='" + user.getJid() + "_" + user.getDomain() + "'] .u-mc", rosterTb).hide();
		},

		__deleteTab = function(user) {
			var index = room;
			if (typeof room !== 'string') {
				index = room.toString();
			}
			if (typeof privacyChatPanels[index] !== "undefined") {
				wasteChatPanels[index] = {};
				wasteChatPanels[index].tab = privacyChatPanels[index].tab;
				wasteChatPanels[index].content = privacyChatPanels[index].content;
				delete privacyChatPanels[index].tab;
				delete privacyChatPanels[index].content;
				wasteChatPanels[index].tab.fadeOut();
				wasteChatPanels[index].content.fadeOut();
			}
		},
		__destoryPrivacyTab = function(room) {
			var index = room;
			if (typeof room !== 'string') {
				index = room.toString();
			}
			privacyChatPanels[index].tab.remove();
			privacyChatPanels[index].content.remove();
			delete privacyChatPanels[index].tab;
			delete privacyChatPanels[index].content;
			delete privacyChatPanels[index];
		},
		__createVCardDialog = function(vCard) {
			var divNode = $("<div class='vCardPanel dialog'></div>"),
				tableNode = $("<table><thead><tr><th width=100></th><th></th></tr></thead><tbody></tbody></table>"),
				index = vCard.toString();
			if (typeof vCardPanels[index] === "undefined") {
				$("tbody", tableNode)
					.append("<tr><td>JID</td><td>" + index + "</td></tr>" +
					"<tr><td>昵称</td><td>" + vCard.getNickname() + "</td></tr>" +
					"<tr><td>性别</td><td>" + vCard.getSex() + "</td></tr>" +
					"<tr><td>生日</td><td>" + vCard.getBirthday() + "</td></tr>" +
					"<tr><td>邮箱</td><td>" + vCard.getEmail() + "</td></tr>" +
					"<tr><td>手机</td><td>" + vCard.getTelephone() + "</td></tr>" +
					"<tr><td>自我描述</td><td>" + vCard.getDescription() + "</td></tr>");
				vCardPanels[index] = divNode.append(tableNode).dialog({
					autoOpen: false,
					closeOnEscape: true,
					draggable: true,
					resizable: false,
					modal: false,
					title: vCard.getNickname() + "的名片",
					width: 400,
					show: "fade",
					hide: "fade"
				});
			}
			vCardPanels[index].dialog("open");
		},
		__createRoster = function(vCard) {
			var trNode = $("<tr jid='" + vCard.getJid() + "_" + vCard.getDomain() + "' ></tr>").css("opacity", "0.3").data("vCard", vCard),
				vCardNode = $("<img class='u-opt' src='resources/vCardIcon.png'/>").bind("click", function(event) {
					var vCard = $(this).parent().parent().data("vCard");
					__createVCardDialog(vCard);
				}),
				unsubscribeNode = $("<img class='u-opt' src='resources/unsubscribeIcon.png'/>").bind("click", function(event) {
					var vCard = $(this).parent().parent().data("vCard");
					__confirm("请确认是否要取消对\"" + vCard.getNickname() + "\"(" + vCard.toString() + ")" + "的订阅？", function() {
						eventProcessor.triggerEvent("service_roster_sendUnsubscribe", [vCard.toSimpleUser()]);
					});
				}),
				showOperatoNode = $("<img class='operate' src='resources/leftIcon.png'/>").bind("click", function(event) {
					$(this).hide();
				});
			operateNode = $("<td></td>").append(vCardNode).append(unsubscribeNode);
			trNode.append("<td><div><span class='u-mc' style='display:none'><img src=''/></span><img class='u-head' src='resources/defaultHeader.jpg'></div></td>");
			trNode.append("<td><div>" + vCard.getNickname() + "</div><div>" + vCard.toString() + "</div></td>");
			trNode.append(operateNode);
			$("img.u-head", trNode).bind("dblclick", function(event) {
				var vCard = $(this).parent().parent().parent().data("vCard");
				__createTab(vCard.toSimpleUser(), vCard.getNickname());
			});
			$("tbody", rosterTb).append(trNode);
		},

		__deleteRoster = function(user) {
			$("tbody tr[jid='" + user.getJid() + "_" + user.getDomain() + "']", rosterTb).remove();
		},

		__printPrivacyMsg = function(user, msgBody, type) {
			var index = user.toString(),
				container,
				msgDiv = $("<div></div>"),
				fragment = $("<td></td>"),
				i,
				m,
				msgQueueLength,
				msgCountSpan;
			if (typeof privacyChatPanels[index] === "undefined") {
				privacyChatPanels[index] = {
					messageQueue: []
				};
			}
			container = privacyChatPanels[index];
			if (typeof container.content !== "undefined") {
				if (type === 'send') {
					fragment.css("float", "right");
					msgDiv.addClass("alert alert-success").text(msgBody);
				} else {
					fragment.css("float", "left");
					msgDiv.addClass("alert alert-info").html(user.toString() + " ： " + msgBody);
				}
				fragment.append(msgDiv);
				$("table tbody", container.content).append($("<tr></tr>").append(fragment));
				$(".u-cta", container.content).scrollTop($(".u-cta", container.content)[0].scrollHeight);
			} else {
				container.messageQueue.push({
					type: type,
					msgBody: msgBody
				});
				msgQueueLength = container.messageQueue.length;
				msgCountSpan = $("tr[jid='" + user.getJid() + "_" + user.getDomain() + "'] .u-mc", rosterTb);
				if (msgQueueLength > 0) {
					msgCountSpan.text(msgQueueLength).show();
				} else {
					msgCountSpan.text(msgQueueLength).hide();
				}
				//提示消息到来
			}
		},
		__printGroupMsg = function(roomUser, msgBody) {
			var index = roomUser.toRoomString(),
				container,
				msgDiv = $("<div></div>"),
				fragment = $("<td></td>"),
				i,
				m,
				msgQueueLength,
				msgCountSpan;
			if (typeof groupChatPanels[index] === "undefined") {
				groupChatPanels[index] = {
					messageQueue: []
				};
			}
			container = groupChatPanels[index];
			if (typeof container.content !== "undefined") {
				if (roomUser.getNickname() === service.getSelfInRoom(index).getNickname()) {
					fragment.css("float", "right");
					msgDiv.addClass("alert alert-success").text(msgBody);
				} else {
					fragment.css("float", "left");
					msgDiv.addClass("alert alert-info").html(roomUser.getNickname() + " ： " + msgBody);
				}
				fragment.append(msgDiv);
				$("table tbody", container.content).append($("<tr></tr>").append(fragment));
				$(".u-cta", container.content).scrollTop($(".u-cta", container.content)[0].scrollHeight);
			} else {
				container.messageQueue.push({
					type: type,
					msgBody: msgBody
				});
				msgQueueLength = container.messageQueue.length;
				msgCountSpan = $("tr[jid='" + user.getJid() + "_" + user.getDomain() + "'] .msgCount", rosterTb);
				if (msgQueueLength > 0) {
					msgCountSpan.text(msgQueueLength).show();
				} else {
					msgCountSpan.text(msgQueueLength).hide();
				}
				//提示消息到来
			}
		},
		__vCardDlgModifyPrepare = function() {
			$("table tbody tr", vCardDialog).each(function() {
				$("td:eq(1)", this).hide();
				$("td:eq(2)", this).show();
			});
			vCardDialog.dialog("option", "buttons", [{
					text: "提交",
					click: __vCardDlgModifySubmit
				}, {
					text: "返回",
					click: __vCardDlgModifyCancel
				}
			]);
		},

		__vCardDlgModifySubmit = function() {
			var vCardTb = $("table tbody tr", vCardDialog),
				newVCard = new VCard({
					sex: $("select", vCardTb).val(),
					desc: $("textarea", vCardTb).val(),
					email: $("input[name='email']", vCardTb).val(),
					tele: $("input[name='tele']", vCardTb).val(),
					bday: $("input[name='bday']", vCardTb).val(),
					nickname: $("input[name='nickname']", vCardTb).val()
				});
			eventProcessor.triggerEvent("service_selfControl_updateMyVCard", [newVCard]);
			__vCardDlgModifyCancel();
		},

		__vCardDlgModifyCancel = function() {
			$("table tbody tr", vCardDialog).each(function() {
				$("td:eq(1)", this).show();
				$("td:eq(2)", this).hide();
			});
			vCardDialog.dialog("option", "buttons", [{
					text: "修改",
					click: __vCardDlgModifyPrepare
				}
			]);
		},
		__noticeError = function(msg) {
			alertify.error(msg);
		},
		__noticeSuccess = function(msg) {
			alertify.success(msg);
		},
		__confirm = function(msg, fnOk, fnCancel) {
			alertify.confirm(msg, function(e) {
				if (e) {
					fnOk.call(this);
				} else {
					fnCancel.call(this);
				}
			});
		},
		__prompt = function(msg, fnOk, fnCancel) {
			alertify.prompt(msg, function(e, str) {
				if (e) {
					fnOk.call(this, str);
				} else {
					fnCancel.call(this, str);
				}
			});
		};

	(function() {
		/*------------登陆初始化------------*/
		$("form", loginDiv).bind("submit", function(event) {
			var username = $("input[name='username']", this).val(),
				password = $("input[name='password']", this).val();
			eventProcessor.triggerEvent("service_selfControl_login", [username, password]);
			event.stopPropagation();
			event.preventDefault();
		});
		/*------------tab初始化------------*/
		/*$('a:last', chatTab).tab('show'); //初始化显示哪个tab 
		$('a', chatTab).click(function(e) {
			e.preventDefault(); //阻止a链接的跳转行为 
			$(this).tab('show'); //显示当前选中的链接及关联的content 
		});*/
		$("#chatTabs").tabs({});
		/*------------头像及个人信息修改初始化------------*/
		$("#myHeader").bind("dblclick", function(event) {
			vCardDialog.dialog("open");
		});

		vCardDialog.dialog({
			autoOpen: false,
			closeOnEscape: true,
			draggable: true,
			resizable: false,
			modal: false,
			title: "个人名片",
			width: 400,
			show: "fade",
			hide: "fade",
			buttons: [{
					text: "修改",
					click: __vCardDlgModifyPrepare
				}
			],
			open: function(event, ui) {
				var dialog = $(this);
				$("table tbody tr", dialog).each(function() {
					$("td:eq(1)", this).show();
					$("td:eq(2)", this).hide();
				});
			}
		});
		/*------------下方按钮初始化------------*/
		$("#subscribeBtn").click(function(event) {
			subscribeDialog.dialog("open");
		});
		$("#optionBtn").click(function(event) {

		});
		$("#chatHistoryBtn").click(function(event) {

		});
		$("#groupChatBtn").click(function(event) {
			$('#groupMenu').slideToggle();
		});
		$("#logoutBtn").click(function(event) {
			$("tbody", rosterTb).html("");
			eventProcessor.triggerEvent("service_selfControl_logout", []);
		});
		$("#createRoomBtn").click(function(event) {
			createRoomDialog.dialog("open");
		});
		$("#joinRoomBtn").click(function(event) {
			findRoomDialog.dialog("open");
		});
		$("#deleteRoomBtn").click(function(event) {

		});

		/*------------订阅对话框初始化-------------*/

		subscribeDialog.dialog({
			autoOpen: false,
			closeOnEscape: true,
			draggable: true,
			resizable: false,
			modal: false,
			width: 800,
			title: "添加好友",
			show: "fade",
			hide: "fade",
			buttons: [{
					text: "申请",
					click: function() {
						var destJid = $("input", subscribeDialog).val();
						if (typeof destJid === "undefined") {
							__noticeError("查找的jid不能为空");
							return;
						}
						eventProcessor.triggerEvent("service_roster_sendSubscribe", [destJid]);
						subscribeDialog.dialog("close");
					}
				}
			],
			open: function(event, ui) {
				$("input", subscribeDialog).val("");
			}
		});

		/*------------创建房间初始化-------------*/
		createRoomDialog.dialog({
			autoOpen: false,
			closeOnEscape: true,
			draggable: true,
			resizable: false,
			modal: false,
			width: 600,
			title: "创建房间",
			show: "fade",
			hide: "fade",
			open: function(event, ui) {
				$("input", createRoomDialog).val("");
				$("textarea", createRoomDialog).val("");
				$("ul", createRoomDialog).html("");
			},
			buttons: [{
					text: "提交",
					click: function(event) {
						var roomConfig,
							oArgs = {
								roomId: $("input[name='roomId']", createRoomDialog).val(),
								roomname: $("input[name='roomname']", createRoomDialog).val(),
								roomdesc: $("textarea[name='roomdesc']").val(),
								enablelogging: $("input[name='enablelogging']").get()[0].checked,
								changesubject: $("input[name='changesubject']").get()[0].checked,
								allowinvites: $("input[name='allowinvites']").get()[0].checked,
								maxusers: $("select[name='maxusers']").val(),
								publicroom: $("input[name='publicroom']").get()[0].checked,
								persistentroom: $("input[name='persistentroom']").get()[0].checked,
								moderatedroom: $("input[name='moderatedroom']").get()[0].checked,
								membersonly: $("input[name='membersonly']").get()[0].checked,
								passwordprotectedroom: $("input[name='passwordprotectedroom']").get()[0].checked,
								roomsecret: $("input[name='roomsecret']").val(),
								whois: $("input[name='whois']").get()[0].checked,
								roomadmins: []
							};

						$("ul[name='roomadmins'] li", createRoomDialog).each(function() {
							oArgs.roomadmins.push($(this).attr("jid"));
						});
						roomConfig = new RoomConfig(oArgs);
						eventProcessor.triggerEvent("service_groupChat_createRoom", roomConfig);
					}
				}
			]
		});
		$("#addAdminBtn", createRoomDialog).click(function(event){
			var liNode = $("<li></li>"),
				userJid = $("input[name='userJid']", createRoomDialog).val(),
				deleteSpan = $("<span><img src='resources/closeChatPanelIcon.png'/></span>");
			deleteSpan.click(function(event){
				$(this).parent().remove();
			});
			liNode.attr("jid", userJid).text(userJid);
			liNode.append(deleteSpan);
			$("ul[name='roomadmins']").append(liNode);
			event.stopPropagation();
			event.preventDefault();
		});

		$("input[name='passwordprotectedroom']", createRoomDialog).bind("click", function(event) {
			if (this.checked === false) {
				$("input[name='roomsecret']", createRoomDialog).parent().parent().hide();
			} else {
				$("input[name='roomsecret']", createRoomDialog).parent().parent().show();
			}
		});
		//加入房间对话框
		joinRoomDialog.dialog({
			autoOpen: false,
			closeOnEscape: true,
			draggable: true,
			resizable: false,
			modal: false,
			width: 600,
			title: "加入房间",
			show: "fade",
			hide: "fade",
			open: function(event, ui) {
				$("input", joinRoomDialog).val("");
				if (!service.getRoomInfo(joinRoomDialog.data("roomJid")).getAttribute("passwordprotected")) {
					$("table tbody tr:eq(1)", joinRoomDialog).hide();
				} else {
					$("table tbody tr:eq(1)", joinRoomDialog).show();
					eventProcessor.triggerEvent("service_groupChat_getOldNick", [joinRoomDialog.data("roomJid")]);
				}
			},
			buttons: [{
					text: "确认",
					click: function(event, ui) {
						var roomUser = new RoomUser({
							room: service.getRoomInfo(joinRoomDialog.data("roomJid")),
							nickname: $("input[name='nickname']", joinRoomDialog).val()
						});
						if (!service.getRoomInfo(joinRoomDialog.data("roomJid")).getAttribute("passwordprotected")) {
							eventProcessor.triggerEvent("service_groupChat_joinRoom", [roomUser]);
						} else {
							eventProcessor.triggerEvent("service_groupChat_joinRoom", [roomUser, $("input[name='password']", joinRoomDialog).val()]);
						}
						joinRoomDialog.dialog("close");
					}
				}
			]
		});

		findRoomDialog.dialog({
			autoOpen: false,
			closeOnEscape: true,
			draggable: true,
			resizable: false,
			modal: false,
			width: 600,
			title: "查找房间",
			show: "fade",
			hide: "fade",
			open: function(event, ui) {
				eventProcessor.triggerEvent("service_groupChat_listRoom", []);
			}
		});

		__initGroupUserContextMenu();
		__initGroupConfigContextMenu();
		__initOutcastDialog();
	}());

	return {
		setSideBarToLogin: function() {
			var index;
			mainDiv.slideUp();
			loginDiv.slideDown();
			for (index in privacyChatPanels) {
				if (Object.prototype.hasOwnProperty.apply(privacyChatPanels, [index])) {
					console.log(index);
					__destoryPrivacyTab(index);
				}
			}
			privacyChatPanels = {};
			for (index in groupChatPanels) {
				if (Object.prototype.hasOwnProperty.apply(groupChatPanels, [index])) {
					console.log(index);
					__destoryRoomChatTab(index);
				}
			}
			groupChatPanels = {};
			$("tbody", rosterTb).html("");
		},
		setSideBarToMain: function() {
			loginDiv.slideUp();
			mainDiv.slideDown();
		},
		addRoster: function(vCard) {
			__createRoster(vCard);
		},
		removeRoster: function(user) {
			__deleteRoster(user);
		},
		setRosterUnavailable: function(user) {
			$("tbody", rosterTb).append($("tbody tr[jid='" + user.getJid() + "_" + user.getDomain() + "']", rosterTb).css("opacity", "0.3"));
		},
		setRosterAvailable: function(user) {
			$("tbody", rosterTb).prepend($("tbody tr[jid='" + user.getJid() + "_" + user.getDomain() + "']", rosterTb).css("opacity", "1"));
		},
		privacyPrintMsg: __printPrivacyMsg,
		groupPrintMsg: __printGroupMsg,
		noticeError: __noticeError,
		noticeSuccess: __noticeSuccess,
		confirm: __confirm,
		drawVCard: function(vCard) {
			var trs = $("table tbody tr", vCardDialog.data("vCard", vCard)),
				i,
				type;
			for (i = trs.length; i--;) {
				type = $(trs[i]).attr("itemType");
				if (type === 'sex') {
					if (vCard.getSex() === 'male') {
						$("td:eq(1)", trs[i]).text("男");
						$("td:eq(2) option:eq(0)", trs[i]).attr("selected", true);
					} else if (vCard.getSex() === 'female') {
						$("td:eq(1)", trs[i]).text("女");
						$("td:eq(2) option:eq(1)", trs[i]).attr("selected", true);
					} else {
						$("td:eq(1)", trs[i]).text("未填写");
					}
				} else if (type === 'bday') {
					$("td:eq(1)", trs[i]).text(vCard.getBirthday());
					$("td:eq(2) input", trs[i]).val(vCard.getBirthday());
				} else if (type === 'desc') {
					$("td:eq(1)", trs[i]).text(vCard.getDescription());
					$("td:eq(2) textarea", trs[i]).val(vCard.getDescription());
				} else if (type === 'tele') {
					$("td:eq(1)", trs[i]).text(vCard.getTelephone());
					$("td:eq(2) input", trs[i]).val(vCard.getTelephone());
				} else if (type === 'email') {
					$("td:eq(1)", trs[i]).text(vCard.getEmail());
					$("td:eq(2) input", trs[i]).val(vCard.getEmail());
				} else if (type === 'nickname') {
					$("td:eq(1)", trs[i]).text(vCard.getNickname());
					$("td:eq(2) input", trs[i]).val(vCard.getNickname());
				}
			}
			$("#myNameAndHeader h3").text(vCard.getNickname());
		},
		listRoom: function(roomList) {
			console.log(roomList);
			try {
				var newNodesStr = "",
					i;
				for (i = roomList.length; i--;) {
					newNodesStr += "<tr><td>" + roomList[i].getRoomName() + "</td><td><button roomJid='" + roomList[i].toString() + "' class='btn btn-primary'>进入</button></td></tr>";
				}
				$("tbody", findRoomDialog).html("").append(newNodesStr);
				$("tbody button", findRoomDialog).bind("click", function(event) {
					joinRoomDialog.data("roomJid", $(this).attr("roomJid")).dialog("open");
					findRoomDialog.dialog("close");
				});
			} catch (e) {
				console.log(e.message);
			}
		},
		drawRoomDetail: function(room) {
			if (room.getAttribute("passwordprotected")) {
				$("button[roomJid='" + room.toString() + "']", findRoomDialog).parent().prepend("<img src='resources/msgWarnIcon.png'/>");
			}
		},
		drawRoomChatTab: __drawRoomChatTab,
		deleteRoomChatTab: __destoryRoomChatTab,
		drawRoomUser: __drawRoomUser,
		deleteRoomUser: __deleteRoomUser,
		drawOutcastList: function(outcastUserList, room) {
			var tbody = $("tbody", outcastDialog),
				i,
				user,
				trNode;
			tbody.html("");
			if (outcastUserList.length === 0) {
				tbody.append("<tr><td colspan=2>没有人被加入黑名单</td></tr>");
				outcastDialog.dialog("open");
				return;
			}
			for (i = outcastUserList.length; i--;) {
				user = outcastUserList[i];
				outcastDialog.dialog("option", "title", room.getRoomName());
				trNode = $("<tr roomJid='" + room.toString() + "' jid='" + user.toString() + "'><td>" + user.toString() + "</td><td><button class='btn btn-danger'>删除</button></td></tr>");
				$("button", trNode).data({
					jid: user.toString(),
					roomJid: room.toString()
				});
				tbody.append(trNode);
			}
			$("button", tbody).click(function(event) {
				eventProcessor.triggerEvent("service_groupChat_deleteOutcast", [$(this).data("jid"), $(this).data("roomJid")]);
			});
			outcastDialog.dialog("open");
		},
		setOldNick: function(oldNick) {
			$("input[name='nickname']", joinRoomDialog).val(oldNick);
		},
		removeOutcast: function(userJid, roomJid) {
			$("tr[jid='" + userJid + "']", outcastDialog).remove();
		},
		createdRoom : function(roomConfig){
			__noticeSuccess("创建房间" + roomConfig.getAttribute("roomname") + "成功");
			createRoomDialog.dialog("close");
		}
	};
}(jQuery, window));