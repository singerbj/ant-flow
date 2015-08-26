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

                var xml = e.target.result;
                $http.post('/data', { xml: xml.toString() } ).success(function(data) {
                    self.targets = data.targets;
                    self.props = data.props;
                    self.xml = data.xml;
                    for (var key in self.targets) {
                        if (self.targets.hasOwnProperty(key)) {
                            self.targetKeys.push(key);
                        }
                    }
                    self.targetKeys.sort();
                    self.baseTarget = self.targetKeys[0];
                    self.update();
                    self.loading = false;
                }).error(function(err) {
                    console.error(err);
                    self.error = err.error;
                    self.loading = false;
                });
            };
            if(file){
                self.fileChosen = true;
                reader.readAsText(file);
            }else{
                self.fileChosen = false;
            }
        });
    };



    self.buildTimeLine = function(currentTarget) {
        if(currentTarget){
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
