var app = require('express')();
var server = require('http').Server(app);
var fs = require('fs');
var parseString = require('xml2js').parseString;
var clone = require('clone');

server.listen(1337);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/targets', function(req, res) {
    fs.readFile('build.xml', function(err, xml) {
        if (err) {
            throw err;
        }

        var allTargets = {};
        parseString(xml, function(err, results) {
            results.project.target.forEach(function(target){
                var targetObj = {};
                // targetObj.name = target.$.name;
                if(target.$.description){
                    targetObj.description = target.$.description ? target.$.description : '';
                }
                if(target.antcall){
                    targetObj.antcalls = target.antcall.map(function(antcall){
                        return antcall.$.target;
                    });
                }else{
                    targetObj.antcalls = [];
                }
                if(target.$.depends){
                    targetObj.depends = target.$.depends.replace(' ', '').split(',');
                }else{
                    targetObj.depends = [];
                }

                allTargets[target.$.name] = targetObj;
            });

            res.json(allTargets);
            // console.dir(allTargets);
            // allTargets.forEach(function(target){
                // if(target.antcalls.length === 0 && target.depends.length > 0){
                //     console.log(target);
                // }
            // });
            // var rootTargets = clone(allTargets);
            // for (var key in rootTargets) {
            //     if (rootTargets.hasOwnProperty(key)) {
            //         var target = rootTargets[key];
            //         if(target.antcalls.length === 0 && target.depends.length > 0){
            //             console.log(key, target);
            //         }
            //     }
            // }

        });
    });
});
