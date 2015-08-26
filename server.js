var app = require('express')();
var server = require('http').Server(app);
var bodyParser = require('body-parser');
var fs = require('fs');
var parseString = require('xml2js').parseString;
var clone = require('clone');

server.listen(1337);

app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/myjs.js', function(req, res) {
    res.sendFile(__dirname + '/myjs.js');
});

app.get('/mycss.css', function(req, res) {
    res.sendFile(__dirname + '/mycss.css');
});

app.post('/data', function(req, res) {
        var body = req.body;
        console.log(typeof body.xml, body.xml);
        var allTargets = {};
        var props = {};
        parseString(body.xml, function(err, results) {
            if(err){
                res.status(500);
                res.json({ error: "Error reading ant build file." });
            }else if(!results || !results.project){
                res.status(500);
                res.json({ error: "This is not an ant build file." });
            }else{
                results.project.target.forEach(function(target){
                    var targetObj = {};
                    targetObj.name = target.$.name.trim();
                    if(target.$.description){
                        targetObj.description = target.$.description.trim() ? target.$.description : '';
                    }
                    if(target.antcall){
                        targetObj.antcalls = target.antcall.map(function(antcall){
                            return antcall.$.target.trim();
                        });
                    }else{
                        targetObj.antcalls = [];
                    }
                    if(target.$.depends){
                        targetObj.depends = target.$.depends.replace(/ /g, '').split(',');
                    }else{
                        targetObj.depends = [];
                    }
                    if(target.$.if){
                        targetObj.if = target.$.if.replace(/ /g, '');
                        if(!props[targetObj.if]){
                            props[targetObj.if] = ({ name: targetObj.if, selected: true });
                        }
                    }
                    if(target.$.unless){
                        targetObj.unless = target.$.unless.replace(/ /g, '');
                        if(!props[targetObj.unless]){
                            props[targetObj.unless] = { name: targetObj.unless, selected: true };
                        }
                    }
                    targetObj.contents = {};
                    for (var key in target) {
                        if (target.hasOwnProperty(key) && key != '$' && key != 'antcall') {
                            targetObj.contents[key] = target[key];
                        }
                    }
                    allTargets[target.$.name] = targetObj;
                });

                res.json({ targets: allTargets, props: props, xml: body.xml });
            }
        });
});
