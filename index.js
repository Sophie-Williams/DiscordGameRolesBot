process.chdir('/home/zlyfer/DiscordBots/DiscordGameRolesBot');
const Discord = require('discord.js');
const client = new Discord.Client();

const fs = require("fs");
const token = require("./token.json");
const guildConfigFolder = "./guildConfig/";
const configTemplate = require("./configTemplate.json");
const botPrefix = "~zlgr~";

function configSetup() {
	var guilds = client.guilds.array();
	for (guild = 0; guild < guilds.length; guild++) {
		var guildFile = guildConfigFolder + guilds[guild].id + ".json";
		if (!fs.existsSync(guildFile)) {
			fs.writeFileSync(guildFile, JSON.stringify(configTemplate), 'utf-8');
		} else {
			var config = require(guildFile);
			var change = false;
			for (var key in configTemplate) {
				if (!(key in config)) {
					config[key] = configTemplate[key];
					change = true;
				}
			}
			if (change == true) {
				fs.writeFileSync(guildFile, JSON.stringify(config), 'utf-8');
			}
		}
	}
}

function getConfig(guildID) {
	var cfile = guildConfigFolder + guildID + ".json";
	if (fs.existsSync(cfile)) {
		var config = require(cfile);
	} else {
		var config = configTemplate;
	}
	return config;
}

function editRoles(guild, oldRolePrefix) {
	var guildConfig = getConfig(guild.id);
	var roles = guild.roles.array();
	for (var role = 0; role < roles.length; role++) {
		var name = roles[role].name;
		var rawName = name.replace(guildConfig.rolePrefix+" ", "").replace(oldRolePrefix+" ", "");
		if (name.indexOf(oldRolePrefix) != -1 || name.indexOf(guildConfig.rolePrefix) != -1) {
			roles[role].edit({name: guildConfig.rolePrefix+" "+rawName, color: guildConfig.roleColor, hoist: guildConfig.roleHoist, mentionable: guildConfig.roleMentionable});
		}
	}
}

function changeConfig(guild, key, newValue) {
	var guildFile = guildConfigFolder + guild.id + ".json";
	var guildConfig = getConfig(guild.id);
	var oldRolePrefix = guildConfig.rolePrefix;
	if ("true".indexOf(newValue) != -1) {
		newValue = true;
	} else if ("false".indexOf(newValue) != -1) {
		newValue = false;
	}
	guildConfig[key] = newValue;
	fs.writeFileSync(guildFile, JSON.stringify(guildConfig), 'utf-8')
	editRoles(guild, oldRolePrefix);
}

function addToRole(callObj) {
 	var guild = callObj.guild;
	var guildConfig = getConfig(guild.id);
	var members = guild.members.array();
	var roles = guild.roles.array();
	var memberObj = {};
	for (var member = 0; member < members.length; member++) {
		if (members[member].user.bot == false) {
			memberObj[members[member].id] = members[member];
		}
	}
	// var roleObj = {};
	// for (var role = 0; role < roles.length; role++) {
	// 	roleObj[roles[role].name] = roles[role].id;
	// }
	var presences = Array.from(guild.presences.entries());
	for (var presence = 0; presence < presences.length; presence++) {
		var game = presences[presence][1].game;
		if (game != null) {
			var gname = game.name;
			if (gname != "Spotify") {
				if (presences[presence][0] in memberObj) {
					var currentmember = memberObj[presences[presence][0]];
					// newrole = roleObj[guildConfig.rolePrefix+" "+gname];
					var newrole = guild.roles.find('name', guildConfig.rolePrefix+" "+gname);
					if (newrole) {
						currentmember.addRole(newrole);
					}
				}
			}
		}
	}
}

function addRoles(callObj) {
	var guild = callObj.guild;
	var guildConfig = getConfig(guild.id);
	var roles = guild.roles.array();
	var presences = Array.from(guild.presences.entries());
	for (var presence = 0; presence < presences.length; presence++) {
		var game = presences[presence][1].game;
		if (game != null) {
			var id = presences[presence][0];
				var rexists = false;
				var gname = game.name;
				if (gname != "Spotify") {
				for (var role = 0; role < roles.length; role++) {
					var rname = roles[role].name;
					if (rname == guildConfig.rolePrefix+" "+gname) {
						rexists = true;
					}
				}
				if (rexists == false) {
					guild.createRole({
						name: guildConfig.rolePrefix+" "+gname,
						color: guildConfig.roleColor,
						hoist: guildConfig.roleHoist,
						mentionable: guildConfig.roleMentionable
					});
				} else {
					addToRole(callObj);
				}
			}
		}
	}
}

function checkPerm(guild, permission) {
	const botID = client.user.id;
	var hasPerm = guild.members.find('id', botID).hasPermission(permission);
	return (hasPerm)
}

function fManage(callObj, caller) {
	var guild = callObj.guild;
	var roleslength = guild.roles.array().length;
	if (roleslength < 250) {
		if (checkPerm(guild, "MANAGE_ROLES")) {
			var guildConfig = getConfig(guild.id);
			if (guildConfig.enable == true) {
				if (caller == "presenceUpdate") {
					if (callObj.user.bot == false) {
						addRoles(callObj);
					}
				} else if (caller = "roleCreate") {
					addToRole(callObj);
				} else {}
			}
		}
	} else {
	}
}

client.on('ready', () => {
	client.user.setPresence({
	  "status": "online",
	  "afk": false,
	  "game": {
	    "name": "Use "+botPrefix+"help for help!"
	  }
	})
	.then(console.log("Bot ready."));
	configSetup();
})

client.on('guildCreate', (guild) => {
	configSetup();
})
client.on('presenceUpdate', (oldMember, newMember) => {
	fManage(newMember, "presenceUpdate");
})

client.on('roleCreate', (role) => {
	fManage(role, "roleCreate");
});

client.on('message', (message) => {
	var content = message.content;
	if (message.author.bot == false && content.indexOf(botPrefix) != -1) {
		if (message.channel.type == "text") {
			content = content.replace(botPrefix, "");
			var guildConfig = getConfig(message.guild.id);
			var hasRights = false;
			if (guildConfig.configRole != false) {
				roles = message.member.roles.array();
				for (var role = 0; role < roles.length; role++) {
					rolename = roles[role].name;
					if (rolename == guildConfig.configRole) {
						hasRights = true;
					}
				}
			}
			if (hasRights == false) {
				var author = message.author.id;
				var owner = message.member.guild.ownerID;
				if (author == owner) {
					hasRights = true;
				}
			}
			if (hasRights == true) {
				var cmd = String(content).split(" ")[0];
				var newValue = String(content).replace(cmd+" ", "").replace(cmd+"", "");
				var changeValid = false;
				switch (cmd) {
					case "help":
						var helpObj = {
							"help": {"parameter": "none", "desc": "Shows this help message."},
							"showSettings": {"parameter": "none", "desc": "Displays the current settings and their values."},
							"rolePrefix": {"parameter": "text", "desc": "The prefix of the role name. Must be at least one character."},
							"roleColor": {"parameter": "HEX", "desc": "The color of the role. Must be a valid, not shortened, HEX format."},
							"roleHoist": {"parameter": "true/false", "desc": "Specifies whether the roles should be hoisted or not."},
							"roleMentionable": {"parameter": "true/false", "desc": "Specifies whether the roles should be able to be mentioned or not."},
							"enable": {"parameter": "true/false", "desc": "This command can enable and disable the bot."},
							"configRole": {"parameter": "text/false", "desc": "Specifies the role the bot listens to. 'false' = owner only."}
						};
						var reply = "help is on the way:\n";
						reply += "Make sure to use **" + botPrefix + "** as prefix!\n";
						reply += "The format is: **COMMAND** __PARAMETER__ - *DESCRIPTION*.\n\n";
						for (var key in helpObj) {
							reply += "**" + key + "** __" + helpObj[key].parameter + "__ - *" + helpObj[key].desc + "*\n";
						}
						reply += "\nINFO: If you encounter any issues or have questions, feel free to contact me.\n";
						message.reply(reply);
						break;
					case "showSettings":
						var reply = "these are the current settings and their values:\n";
						for (var key in guildConfig) {
							reply += "**" + key + "**: __" + guildConfig[key] + "__\n";
						}
						message.reply(reply);
						break;
					case "rolePrefix":
						if (newValue.length < 1) {
							message.reply("you need to specify at least one character.");
						} else {
							changeValid = true;
						}
						break;
					case "roleColor":
						changeValid = /^[0-9A-F]{6}$/i.test(newValue);
						if (changeValid == false) {
							message.reply("you need to specify a valid HEX color format. (Example: FF0000)");
						}
						break;
					case "roleHoist":
						if (newValue == "true" || newValue == "false") {
							changeValid = true;
						} else {
							message.reply("please use either true or false.");
						}
						break;
					case "roleMentionable":
						if (newValue == "true" || newValue == "false") {
							changeValid = true;
						} else {
							message.reply("please use either true or false.");
						}
						break;
					case "configRole":
						if (newValue == "false") {
							changeValid = true;
						} else {
							var roles = message.guild.roles.array();
							for (var role = 0; role < roles.length; role++) {
								if (roles[role].name == newValue) {
									changeValid = true;
								}
							}
							if (changeValid == false) {
								message.reply("you need to specifiy an existing role. Please add the role **" + newValue + "** and try again.");
							}
						}
						break;
					case "enable":
						if (newValue == "true" || newValue == "false") {
							changeValid = true;
						} else {
							message.reply("please use either true or false.");
						}
						break;
				}
				if (changeValid == true) {
					changeConfig(message.guild, cmd, newValue);
					message.reply("**" + cmd + "** *has been changed to* **" + newValue + "**.");
				}
			} else {
				message.reply("sorry but you seem to lack on rights to use me.")
			}
		} else {
			message.reply(" sorry, but I am supposed to be controlled via a text channel on a discord server.");
		}
	}
});

process.on('unhandledRejection', (err) => {
	console.error(err);
})

client.login(token.token);
