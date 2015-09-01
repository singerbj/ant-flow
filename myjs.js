var app = angular.module('app', []);

app.controller('Controller', ["$scope", "$http", function($scope, $http) {
    var self = this;
    self.loading = true;
    self.fileChosen = false;
    self.showResults = true;
    self.showXml = false;
    self.showCommandOrder = false;
    self.error = "";
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
            var reader = new FileReader();
            reader.onload = function(e) {
                self.convert(e.target.result.toString());
            };
            if (file) {
                self.fileChosen = true;
                reader.readAsText(file);
            } else {
                self.fileChosen = false;
            }
        });
    };

    self.convert = function(xml){
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
            $scope.$apply();
        } catch (e) {
            self.error = true;
            throw e;
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
}]);
