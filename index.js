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
    var rawName = name.replace(guildConfig.rolePrefix + " ", "").replace(oldRolePrefix + " ", "");
    if (name.indexOf(oldRolePrefix) != -1 || name.indexOf(guildConfig.rolePrefix) != -1) {
      roles[role].edit({
        name: guildConfig.rolePrefix + " " + rawName,
        color: guildConfig.roleColor,
        hoist: guildConfig.roleHoist,
        mentionable: guildConfig.roleMentionable
      });
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

function checkPerm(guild, permission) {
  const botID = client.user.id;
  var hasPerm = guild.members.find('id', botID).hasPermission(permission);
  return (hasPerm)
}

client.on('ready', () => {
  client.user.setPresence({
      "status": "online",
      "afk": false,
      "game": {
        "name": "Use " + botPrefix + "help for help!"
      }
    })
    .then(console.log("Bot ready."));
  configSetup();
})

client.on('guildCreate', (guild) => {
  configSetup();
})

client.on('presenceUpdate', (oldMember, newMember) => {
  if (newMember) {
    if (!(newMember.user.bot)) {
      var guild = newMember.guild;
      if (checkPerm(guild, "MANAGE_ROLES")) {
        if (guild.roles.array().length < 240) {
          var guildConfig = getConfig(guild.id);
          if (guildConfig.enable) {
            var game = newMember.presence.game;
            if (game) {
              var gname = game.name.replace("'", "").replace("’", "").replace("`", "");
              gname = gname.replace(/[^\w\s!]/gi, '');
              gname = gname.replace(/ [^\w\s!] |[^\w\s!] | [^\w\s!]/gi, ' ').toUpperCase();
              if (guildConfig.blenable == false | (guildConfig.blenable && guildConfig.blacklist.indexOf(gname) == -1)) {
                var role = guild.roles.find('name', `${guildConfig.rolePrefix} ${gname}`);
                if (role) {
                  newMember.addRole(role);
                } else {
                  guild.createRole({
                      name: `${guildConfig.rolePrefix} ${gname}`,
                      color: guildConfig.roleColor,
                      hoist: guildConfig.roleHoist,
                      mentionable: guildConfig.roleMentionable
                    })
                    .then(role => newMember.addRole(role));
                }
              }
            }
          }
        }
      }
    }
  }
})

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
        var newValue = String(content).replace(cmd + " ", "").replace(cmd + "", "");
        var changeValid = false;
        switch (cmd) {
          case "help":
            var helpObj = {
              "help": {
                "parameter": "none",
                "desc": "Shows this help message."
              },
              "showSettings": {
                "parameter": "none",
                "desc": "Displays the current settings and their values."
              },
              "rolePrefix": {
                "parameter": "text",
                "desc": "The prefix of the role name. Must be at least one character."
              },
              "roleColor": {
                "parameter": "HEX",
                "desc": "The color of the role. Must be a valid, not shortened, HEX format."
              },
              "roleHoist": {
                "parameter": "true/false",
                "desc": "Specifies whether the roles should be hoisted or not."
              },
              "roleMentionable": {
                "parameter": "true/false",
                "desc": "Specifies whether the roles should be able to be mentioned or not."
              },
              "enable": {
                "parameter": "true/false",
                "desc": "This command can enable and disable the bot."
              },
              "configRole": {
                "parameter": "text/false",
                "desc": "Specifies the role the bot listens to. 'false' = owner only."
              },
              "removeDuplicates": {
                "parameter": "none",
                "desc": "Removes duplicate roles and reassigns the member of them to the original role."
              },
              "removeSingleRoles": {
                "parameter": "none",
                "desc": "Removes all roles created by this bot that have only 1 or less members."
              },
              "blenable": {
                "parameter": "true/false",
                "desc": "Enable/Disable blacklist."
              },
              "blacklist": {
                "parameter": "text",
                "desc": "Add a name or more to the blacklist. If a given name is already present it will be removed. Can be comma-seperated: 'spotify, blender, game launcher'."
              }
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
          case "blacklist":
            if (newValue.length > 0 && newValue[0] != ",") {
              var newValues = newValue.split(',');
              for (let i = 0; i < newValues.length; i++) {
                let nv = newValues[i];
                if (nv.length > 0 && nv != '"' && nv != "'" && nv != ',') {
                  nv = nv.replace("'", "").replace("’", "").replace("`", "");
                  nv = nv.replace(/[^\w\s!]/gi, '');
                  nv = nv.replace(/ [^\w\s!] |[^\w\s!] | [^\w\s!]/gi, ' ').toUpperCase();
                  if (nv[0] == " ") {
                    nv = nv.slice(1);
                  }
                  let iof = guildConfig.blacklist.indexOf(nv);
                  if (iof != -1) {
                    guildConfig.blacklist.splice(iof, 1);
                  } else {
                    guildConfig.blacklist.push(nv);
                  }
                }
              }
              newValue = guildConfig.blacklist;
              changeValid = true;
            } else {
              message.reply("you need to specify at least one name.");
            }
            break;
          case "blenable":
            if (newValue == "true" || newValue == "false") {
              changeValid = true;
            } else {
              message.reply("please use either true or false.");
            }
            break;
          case "removeDuplicates":
            if (checkPerm(message.guild, "MANAGE_ROLES")) {
              var roleCount = 0;
              var memberCount = 0;
              var rlist = [];
              var roles = message.guild.roles.array();
              for (let i = 0; i < roles.length; i++) {
                if (roles[i].name.indexOf(guildConfig.rolePrefix) == 0) {
                  rlist.push(roles[i])
                }
              }
              var singles = {};
              for (let i = 0; i < rlist.length; i++) {
                let role = rlist[i];
                if (role.name in singles) {
                  let members = role.members.array();
                  let orole = message.guild.roles.find('id', singles[role.name]);
                  for (let j = 0; j < members.length; j++) {
                    members[j].addRole(orole)
                      .then(console.log(`Added a user to a original role.`));
                    memberCount++;
                  }
                  role.delete()
                    .then(console.log(`Deleted a duplicate role.`));
                  roleCount++;
                } else {
                  singles[role.name] = role.id;
                }
              }
              message.reply("Done.\nMembers reassigned: " + memberCount + ".\nDuplicate roles deleted: " + roleCount + ".");
            } else {
              message.reply("Sorry, but I do not seem to have permissions to manage roles on this server.");
            }
            break;
          case "removeSingleRoles":
            if (checkPerm(message.guild, "MANAGE_ROLES")) {
              var roles = message.guild.roles.array();
              var deleted = 0;
              for (let i = 0; i < roles.length; i++) {
                if (roles[i].name.indexOf(guildConfig.rolePrefix) != -1) {
                  if (roles[i].members.array().length <= 1) {
                    roles[i].delete()
                      .then(deleted++);
                  }
                }
              }
              message.reply(`${deleted} roles have been deleted.`);
            } else {
              message.reply(`Sorry, but I do not seem to have the permissions needed to perform this task.`);
            }
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