	
function translateDate(number)
{
	var date = new Date(parseInt(number))
	date2 = date.toString();
	hours = date.getHours();
	return hours;
}	



function feedDemographyTab()
{
		var tabRslt={};
		for(var i =0;i<tabUniqueVisitor.length;i++)
		{
			console.log
			var obj={};
			obj[tabUniqueVisitor[i]]=0;
			tabRslt.push(obj);
		}

		console.log(tabRslt);
		console.log(dataImported.length);
		for(var i = 0; i < dataImported.data.length; i++) {
			(function (i) {
			console.log(i);
			var schedule = translateDate(dataImported.data[i].timestamp);
			// if(schedule==conditionTime){
				console.log(schedule);
				console.log(tabRslt[dataImported.data[i].name]=tabRslt[dataImported.data[i].name]++);
				tabRslt[dataImported.data[i].name]++;
			// }
			console.log(obj);
		}).call(this, i);
		}
	
}
