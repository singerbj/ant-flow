var app = angular.module('app', []);

app.controller('Controller', ["$scope", "$http", function($scope, $http) {
    var self = this;
    self.loading = true;
    self.fileChosen = false;
    self.showResults = true;
    self.showXml = false;
    self.showCommandOrder = false;
    self.error = "";
    self.filename = "";
    self.targets = {};
    self.props = {};
    self.targetKeys = [];
    self.timeline = [];

    $scope.file_changed = function(element) {
        $scope.$apply(function(scope) {
            self.loading = true;
            self.error = "";
            self.targets = {};
            self.props = {};
            self.targetKeys = [];
            self.timeline = [];

            var file = element.files[0];
            f = file;
            var reader = new FileReader();
            reader.onload = function(e) {
                var date = new Date();
                self.convert(e.target.result.toString(), file.name + " (" + date.toLocaleTimeString() + " - " + date.toLocaleDateString() + ")");
            };
            if (file) {
                self.fileChosen = true;
                reader.readAsText(file);
            } else {
                self.fileChosen = false;
            }
        });
    };

    self.convert = function(xml, filename) {
        try {
            var x2js = new X2JS();
            var json = x2js.xml_str2json(xml);
            var allTargets = {};
            var props = {};
            json.project.target.forEach(function(target) {
                var targetObj = {};
                targetObj.name = target._name.trim();
                if (target._description) {
                    targetObj.description = target._description.trim() ? target._description : '';
                }
                if (target.antcall && target.antcall.length) {
                    targetObj.antcalls = target.antcall.map(function(antcall) {
                        return antcall._target.trim();
                    });
                } else if (target.antcall && !target.antcall.length) {
                    targetObj.antcalls = [target.antcall._target.trim()];
                } else {
                    targetObj.antcalls = [];
                }
                if (target._depends) {
                    targetObj.depends = target._depends.replace(/ /g, '').split(',');
                } else {
                    targetObj.depends = [];
                }
                if (target._if) {
                    targetObj.if = target._if.replace(/ /g, '');
                    if (!props[targetObj.if]) {
                        props[targetObj.if] = ({
                            name: targetObj.if,
                            selected: true
                        });
                    }
                }
                if (target._unless) {
                    targetObj.unless = target._unless.replace(/ /g, '');
                    if (!props[targetObj.unless]) {
                        props[targetObj.unless] = {
                            name: targetObj.unless,
                            selected: true
                        };
                    }
                }
                targetObj.contents = {};
                for (var key in target) {
                    if (target.hasOwnProperty(key) && key != '$' && key != 'antcall') {
                        targetObj.contents[key] = target[key];
                    }
                }
                allTargets[target._name] = targetObj;
            });

            self.filename = filename;
            self.targets = allTargets;
            self.props = props;
            self.xml = xml;
            for (var key in self.targets) {
                if (self.targets.hasOwnProperty(key)) {
                    self.targetKeys.push(key);
                }
            }
            self.targetKeys.sort();
            self.baseTarget = self.targetKeys[0];
            self.update();
            self.loading = false;
            if(self.saveXML){
                self.saveXML({
                    name: filename,
                    targets: self.targets,
                    props: self.props,
                    targetKeys: self.targetKeys,
                    timeline: self.timeline,
                    xml: self.xml
                });
            }
            $scope.$apply();
        } catch (e) {
            self.loading = false;
            self.error = "Error converting uploaded file.";
            $scope.$apply();
            console.error(e);
        }
    };



    self.buildTimeLine = function(currentTarget) {
        if (currentTarget) {
            var miniTL = [];
            if (currentTarget.depends) {
                currentTarget.depends.forEach(function(target) {
                    miniTL = miniTL.concat(self.buildTimeLine(self.targets[target]));
                });
            }
            miniTL.push(currentTarget);
            if (currentTarget.antcalls) {
                currentTarget.antcalls.forEach(function(target) {
                    miniTL = miniTL.concat(self.buildTimeLine(self.targets[target]));
                });
            }
            return miniTL;
        }
    };

    self.update = function() {
        self.timeline = [];
        self.appendXMLContent();
        try {
            self.timeline = self.buildTimeLine(self.targets[self.baseTarget]);
        } catch (e) {
            self.error = "Your Ant file creates creates a never ending loop. Fix it.";
            throw e;
        }
    };

    self.appendXMLContent = function() {
        var xml = $($.parseXML(self.xml));
        xml.find('antcall').remove();
        for (var key in self.targets) {
            if (self.targets.hasOwnProperty(key)) {
                self.targets[key].contents = xml.find('target[name="' + key + '"]')[0].innerHTML.replace(/ +(?= )/g, '');
            }
        }
    };

    self.propsFilter = function() {
        if (self.useProps) {
            var returnArr = [];
            for (var key in self.timeline) {
                if (self.timeline.hasOwnProperty(key)) {
                    var target = self.timeline[key];
                    if (!((target.if && self.props[target.if].selected === false) || (target.unless && self.props[target.unless].selected === true))) {
                        returnArr.push(target);
                    }
                }
            }
            return returnArr;
        } else {
            return self.timeline;
        }
    };


    if (typeof(window.localStorage) != 'undefined') {
        var s = window.localStorage;
        self.loadXML = function() {
            self.recent = JSON.parse(s.getItem('recent'));
        };

        self.setXML = function(xmlObj) {
            self.loading = true;
            self.filename = xmlObj.name;
            self.xml = xmlObj.xml;
            self.targets = xmlObj.targets;
            self.props = xmlObj.props;
            self.targetKeys = xmlObj.targetKeys;
            self.targetKeys.sort();
            self.timeline = xmlObj.timeline;
            self.baseTarget = self.targetKeys[0];
            self.update();
            self.loading = false;
        };

        self.saveXML = function(xmlObj) {
            self.recent = JSON.parse(s.getItem('recent'));
            if(!self.recent) self.recent = [];
            self.recent.unshift(xmlObj);
            if(self.recent.length > 5) self.recent.splice(5, self.recent.length);
            s.setItem('recent', JSON.stringify(self.recent));
        };

        //load recent
        self.loadXML();
    } else {
        throw "No saving and loading of recent xml files possible in this browser.";
    }

}]);
