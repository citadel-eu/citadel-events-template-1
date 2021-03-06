/****************** Functions *****************************/

/* Initialization function.
 * It is called once when the page is load
 */
function globalInit() {
    getPoisFromDataset(function(pois) {
        setFilters();
        hideAddressBar();
        setTimeout(function(){
            fixMapHeight();
            initializeMap(mapLat, mapLon);
        }, 500);
        loadListPageData();
        refreshListPageView();
        loadDetailsPage();
        loadInfoPage();
    });

    //Enable scroll for older versions of android
    touchScroll('mapFilterList');
}

/* Returns an array of poi objects.
 * The poi object contains the data described in the 
 * Citadel Common POI format
 */
function getPoisFromDataset(resultCallback)
{
        
    $.getJSON(datasetUrl, function(data) {
        meta['id'] = data.dataset.identifier;
        meta['updated'] = data.dataset.updated;
        meta['created'] = data.dataset.created;
        meta['lang'] = data.dataset.lang;
        meta['author_id'] = data.dataset.author.id;
        meta['author_value'] = data.dataset.author.value;

        $.each(data.dataset.poi, function(i, poi) {
            pois[poi.id] = poi;
        });
        resultCallback(pois);
    });
}

/* Initialises a google map using map api v3 */
function initializeMap(Lat, Lon) {

    //define the center location 
    var myLatlng = new google.maps.LatLng(Lat, Lon);
    //define the map options
    var mapOptions = {
        center: myLatlng,
        zoom: mapZoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    //instantiate the map wih the options and put it in the div holder, "map-canvas"
    map = new google.maps.Map(document.getElementById("map_canvas"),
        mapOptions);
    addMarkers();
}

/* Adds all the markers on the global map object */
function addMarkers()
{
    for (var i = 0; i < markersArray.length; i++) {
        markersArray[i].setMap(null);
    }
    markersArray = new Array();
    if (infoBubble)
        overrideBubbleCloseClick();
    
    /* var oms will hold all the markers so as to resolve
     * the issue of overlapping ones
     */
    var oms = new OverlappingMarkerSpiderfier(map);
    var iw = new google.maps.InfoWindow();
    oms.addListener('click', function(marker) {
        iw.setContent(marker.desc);
        iw.open(map, marker);
    });

    /* We initialize the infobubble styling */
    infoBubble = new InfoBubble({
        shadowStyle: 1,
        padding: 0,
        backgroundColor: '#304027',
        borderRadius: 10,
        arrowSize: 10,
        borderWidth: 2,
        maxWidth: 300,
        borderColor: '#79b459',
        disableAutoPan: false,
        arrowPosition: 30,
        arrowStyle: 2,
        hideCloseButton: true
    });

    /* For every POI we add a marker with an attached infoBubble */
    $.each(pois, function(i, poi) {
        if (isFilterSelected(poi.category)) {
            /*  posList contains a list of space separated coordinates.
             *  The first two are lat and lon
             */
            var coords = poi.location.point.pos.posList.split(" ");
            var current_markerpos = new google.maps.LatLng(coords[0], coords[1]);
            var marker_image = getFavouriteValue(poi.id)?"images/star.png":getMarkerImage();
            var current_marker = new google.maps.Marker({
                position: current_markerpos,
                map: map,
                icon: marker_image
            });

            markersArray.push(current_marker);
            oms.addMarker(current_marker);
            google.maps.event.addListener(current_marker, 'click', function() {
                infoBubble.setContent(setInfoWindowPoi(poi));
                infoBubble.open(map, current_marker);

                setTimeout("$('#eventBubble').parent().parent().css('overflow', 'hidden')", 100);
            });
        }
    });
}

/*
 * Returns the marker image picking a random color
 */
var markerRotate = 1;
function getMarkerImage() {
    var marker_image = 'images/pin' + markerRotate + '.png';
    markerRotate = markerRotate >= 3 ? 1 : markerRotate + 1;

    return marker_image;
}


/* Sets the content of the infoBubble for the given 
 * event
 */
function setInfoWindowPoi(poi)
{
    var category = "";

    /* Get the Event specific attributes of the POI */
    if (poi.category.length > 0) {
        category = "<div class='category'>" +
            poi.category.join(', ') +
            "</div>";
    }

    var contentTemplate =
        "<div id='eventBubble'><a href='#page3' onclick='overrideDetailClick(\"" + poi.id + "\"); return false;'>" +
        "<div class='title'>" +
        poi.title +
        "</div>" +
        "<div class='address'>" + poi.location.address.value +
        "</div>\n" + category +
        "</a></div><div id='bubbleClose'><a href='' onclick='return overrideBubbleCloseClick();'><img src='images/close.png' width='25' height='25' alt='close' /></a></div>";

    return contentTemplate;
}

/* Sets the content of the details page for the given 
 * event
 */
function setDetailPagePoi(poi)
{
    /* Get the Event specific attributes of the POI */
    var image = getCitadel_attr(poi, "#Citadel_image").text;
    var telephone = getCitadel_attr(poi, "#Citadel_telephone").text;
    var website = getCitadel_attr(poi, "#Citadel_website").text;
    var email = getCitadel_attr(poi, "#Citadel_email").text;   
    var openHours = getCitadel_attr(poi, "#Citadel_openHours").text;
    var nearTransport = getCitadel_attr(poi, "#Citadel_nearTransport").text;
    var eventStart = getCitadel_attr(poi, "#Citadel_eventStart").text;
    var eventEnd = getCitadel_attr(poi, "#Citadel_eventEnd").text;
    var eventPlace = getCitadel_attr(poi, "#Citadel_eventPlace").text;
    var eventDuration = getCitadel_attr(poi, "#Citadel_eventDuration").text;
    var otherAttributes = getCitadel_attrs(poi, "");


    var contentTemplate =
        "<div class='event-data'>" +
        "<ul>";

    if (image)
        contentTemplate += "<li class='image'><img src='" + image + "' alt='Event image' /></li>";
    
    var eventStartEndDate = "";
    if (eventStart)
        eventStartEndDate += eventStart;
    if (eventEnd)
        eventStartEndDate += " - " + eventEnd;
    if (eventStartEndDate)
        eventStartEndDate = " (" + eventStartEndDate + ")";

    contentTemplate += "<li><h1>" + poi.title + eventStartEndDate + "</h1></li>";
    
    if (poi.description) {
        contentTemplate += "<li>" + poi.description + "</li>";
    }
    if (poi.location.address.value) {
        contentTemplate += "<li>" + poi.location.address.value + " " + poi.location.address.postal + "</li>";
    }
    if (poi.category) {
        contentTemplate += "<li>" + poi.category + "</li>";
    }

    /* Display the Event specific attributes of the POI if they exist */
    if (telephone)
        contentTemplate += "<li><span class='image-icon'><img src='images/small-phone.png' alt='Telephone' /></span><span class='image-text'><a href='tel:" + telephone + "'>" + telephone + "</a></span></li>";
    if (website)
        contentTemplate += "<li><span class='image-icon'><img src='images/small-website.png' alt='Telephone' /></span><span class='image-text'><a href='" + website + "' target='_blank'>" + website + "</a></span></li>";
    if (email)
        contentTemplate += "<li><span class='image-icon'><img src='images/small-email.png' alt='Telephone' /></span><span class='image-text'><a href='mailto:" + email + "'>" + email + "</a></span></li>";
    if (openHours)
        contentTemplate += "<li><span class='image-icon'><img src='images/small-openhours.png' alt='Telephone' /></span><span class='image-text'>" + openHours + "</span></li>";
    if (nearTransport)
        contentTemplate += "<li><span class='image-icon'><img src='images/small-transportation.png' alt='Telephone' /></span><span class='image-text'>" + nearTransport + "</span></li>";
    if (eventDuration)
        contentTemplate += "<li><span>" + getCitadel_attr(poi, "#Citadel_eventDuration").term + "</span>" + eventDuration + "</li>";
    if (eventPlace)
        contentTemplate += "<li><span>" + getCitadel_attr(poi, "#Citadel_eventPlace").term + "</span>" + eventPlace + "</li>";

    /* Display the rest attributes of the POI */
    for (i = 0; i < otherAttributes.length; i++) {
        contentTemplate += "<li><span>" + otherAttributes[i].term + "</span>" + otherAttributes[i].text + "</li>";
    }

    contentTemplate += "</ul>" +
        "</div>";

    return contentTemplate;
}

/* Sets the content of the Listing Page         */
function setListPagePois()
{
    var contentTemplate = "";

    $.each(pois, function(i, poi) {
        if (isFilterSelected(poi.category)) {
            var category = "";
            if (poi.category) {
                category = "<p>" +
                    poi.category +
                    "</p>";
            }

            var isFavourite = getFavouriteValue(poi.id);
            var image = (isFavourite?"images/star.png":getMarkerImage());
            var className = (isFavourite?" class='favourite'":" class='nonfavourite'");

            contentTemplate +=
                "<li" + className + ">" +
                "<a href='' onclick='overrideDetailClick(\"" + poi.id + "\"); return false;'>" +
                "<img src='" + image + "' alt='Event' />" +
                "<h3>" + poi.title + "</h3>" +
                "<h4>" + poi.description + "</h4>" +
                category +
                "</a>" +
                "</li>";
        }
    });
    return contentTemplate;
}

/* Sets the content of the info page 
 * based on dataset metadata
 */
function setInfoPage()
{
    var contentTemplate =
        "<li>Dataset ID: <b>" + meta.id + "</b></li>" +
        "<li>Created at: <b><time>" + meta.created + "</time></b></li>" + 
        "<li>Updated at: <b><time>" + meta.updated + "</time></b></li>" + 
        "<li>Language: <b>" + meta.lang + "</b></li>" + 
        "<li>Author ID: <b>" + meta.author_id + "</b></li>" + 
        "<li>Author Value: <b>" + meta.author_value + "</b></li>" + 
        "<li>Created by: <b><a href='http://www.atc.gr' target='_blank'>atc.gr</a></b></li>";

    return contentTemplate;
}

/*  Returns the attribute with the given tplIdentifer
 *  or an empty object if there is no such an atttibute
 *  Expected values for the tplIdentifer are:
 * 
 *     #Citadel_telephone                 
 *     #Citadel_website                                      
 *     #Citadel_email                                                           
 *     #Citadel_parkType                                                                                
 *     #Citadel_parkFloors                                                                                                      
 *     #Citadel_parkCapacity                                                                                                                          
 *     #Citadel_image                                                                                                                                               
 *     #Citadel_eventStart                                                                                                                                                                    
 *     #Citadel_eventEnd
 *     #Citadel_eventPlace
 *     #Citadel_eventDuration 
 *     #Citadel_openHours 
 *     #Citadel_nearTransport                                                                                                                                                                                                                                                                                                                                                                                               
 */
function getCitadel_attr(poi, tplIdentifer) {
    var attribute = {
        "term": "",
        "type": "",
        "text": ""
    };
    $.each(poi.attribute, function(i, attr) {
        if (attr.tplIdentifier === tplIdentifer)
        {
            attribute = {
                "term": attr.term,
                "type": attr.type,
                "text": attr.text
            };
            return false;
        }
    });
    return attribute;
}

/*  Returns an array of all the attributes with 
 *  the given tplIdentifer.    
 */
function getCitadel_attrs(poi, tplIdentifer) {
    var attributes = new Array();
    $.each(poi.attribute, function(i, attr) {
        if (attr.tplIdentifier === tplIdentifer)
        {
            attribute = {
                "term": attr.term,
                "type": attr.type,
                "text": attr.text
            };
            attributes.push(attribute);
        }
    });
    return attributes;
}

/* Bubble on click event listener */
function overrideDetailClick(id) {
    //Get poi by id
    var poi = pois[id];
    //Pass data to details constructor
    $('#item').html(setDetailPagePoi(poi));

    $.mobile.changePage("#page3", { transition: "none", reverse: false, changeHash: false});
    window.location.href = "#page3?id=" + id;
    showFavouriteButtons(id);

    return true;
}

/* Bubble close click event listener */
function overrideBubbleCloseClick() {
    infoBubble.close();
    return false;
}

/* Load list page using pois variable */
function loadListPageData() {
    $('#list > ul').html(setListPagePois());
}

/* Refreshes the list of POIS in the List Page */
function refreshListPageView() {
    if ($("#list > ul").hasClass("ui-listview")) {
        $("#list > ul").listview('refresh');
    }
}

/* Refreshes the global map onject */
function refreshMap() {
    if (map) {
        google.maps.event.trigger(map, 'resize');
    }
}

/* Loads the Details Page of a POI */
function loadDetailsPage() {
    /* pageId equals 0 when the Home Page or the List page 
     * is active
     */
    if (pageId != 0) {
        $('#item').html(setDetailPagePoi(pois[pageId]));
        showFavouriteButtons(pageId);
        pageId = 0;
    }
}

/* Loads the Metadata Info Page */
function loadInfoPage() {
    $('#info > article > ul').html(setInfoPage());
}

/****************** Event Handlers*************************/

$(document).ready(function() {

    /* Click handler for the 'near me' button */
    $('.pois-nearme').click(function() {
        lastLoaded = 'mearme';
        $.mobile.changePage("#page1", { transition: "none"});
        $('.navbar > ul > li > a').removeClass('ui-btn-active');
        $('.pois-nearme').addClass('ui-btn-active');

        /* Check if we can get geolocation from the browser */
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                var myLatlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                //define the map options
                var mapOptions = {
                    center: myLatlng,
                    zoom: mapZoom,
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                };
                map.setOptions(mapOptions);

                if (!isNearMeMarkerLoaded) {
                    /* Load near me marker only once */
                    isNearMeMarkerLoaded = true;
                    var currentmarkerpos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

                    var currentmarker = new google.maps.Marker({
                        position: currentmarkerpos,
                        map: map
                    });
                }
            });
        } else {
            initializeMap(mapLat, mapLon);
            google.maps.event.trigger(map, 'resize');
        }
    });

    /* Click handler for the 'show all' button */
    $('.pois-showall').click(function() {
        if (lastLoaded != 'showall') {
            lastLoaded = 'showall';
            var myLatlng = new google.maps.LatLng(mapLat, mapLon);
            //define the map options
            var mapOptions = {
                center: myLatlng,
                zoom: mapZoom,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            map.setOptions(mapOptions);
        }

        $.mobile.changePage("#page1", { transition: "none"});
        $('.navbar > ul > li > a').removeClass('ui-btn-active');
        $('.pois-showall').addClass('ui-btn-active');
    });

    /* Click handler for the 'list' button */
    $('.pois-list').click(function() {
        $.mobile.changePage("#page2", { transition: "none"});
    });

    /* Checks for the active page and performs the 
     * relevant actions
     */
    $('.page').bind("pageshow", function(event, data) {
        if ($(this).attr('id') == 'page1') {
            refreshMap();
            pageId = 0;
        }
        if ($(this).attr('id') == 'page2') {
            $('.navbar > ul > li > a').removeClass('ui-btn-active');
            $('.pois-list').addClass('ui-btn-active');
//            refreshListPageView();
            pageId = 0;
        }
        if ($(this).attr('id') == 'page3') {
            $('.navbar > ul > li > a').removeClass('ui-btn-active');
        }
    });
    
    /* Click handler for the filters button */    
    $('#filter').click(function() {
        if ($('#map-filter').is(":visible")) {
            $('#map-filter').slideUp();
        } else {
            $('#map-filter').slideDown();
        }
        return false;
    });
    
    /* Click handler for the aply button inside the filters page. 
     * The markers on the map will be updated according to the 
     * selected filters.
     */
    $('#apply').click(function() {
        if ($('#map-filter').is(":visible")) {
            $('#map-filter').slideUp();
            var checked_objs = $('.map-filter:checked');
            var set_filters = new Array();
            checked_objs.each(function(k, v) {
                set_filters.push($(v).val());
            });
            setSelectedFilters(set_filters);
            addMarkers();
            loadListPageData();
            refreshListPageView();
        } else {
            $('#map-filter').slideDown();
        }
        return false;
    });
    
    /* Adds a poi to favourites list and use
     * local storage to remember my favourites
     */
    $('#addFav').click(function(){
        var id = $(this).attr('rel');
        setLocalValue('favouritepois' + id, true);
        $('#addFav').hide();
        $('#removeFav').show();
        $('#removeFav').attr('rel', id);
        
        addMarkers();
        loadListPageData();
        refreshListPageView();
    });
    
    /* Removes a poi from favourites list and 
     * remove it from local storage
     */
    $('#removeFav').click(function(){
        var id = $(this).attr('rel');
        removeLocalValue('favouritepois' + id);
        $('#addFav').show();
        $('#addFav').attr('rel', id);
        $('#removeFav').hide();
        
        addMarkers();
        loadListPageData();
        refreshListPageView();
    });
    
    /* Used to filter list page and show
     * only favourites that are currently loaded
     */
    $('#favourites').change(function(){
        var o = $(this);
        if (o.is(':checked')) {
            $('.nonfavourite').addClass('ui-screen-hidden');
        } else {
            $('.ui-input-text').val('');
            $('.nonfavourite').removeClass('ui-screen-hidden');
            $('.favourite').removeClass('ui-screen-hidden');
        }
    });
}); // end $(document).ready


/* Sets the available filters  */
function setFilters() {
    var filters_html = "";

    for (i = 0; i < filters.length; i++) {
        var filter = filters[i];
        var checked = filter.selected?' checked':'';
        
        filters_html += "<input type='checkbox'" + checked + " name='map-filter' id='map-filter" + i + "' class='map-filter' value=\"" + filter.name + "\" />" +
            "<label for='map-filter" + i + "'>" + filter.name + "</label>";
    }
    $('#map-filter > div > fieldset').html(filters_html);
    $('#map-filter > div > fieldset > input').checkboxradio({ mini: true});
}

/* Refreshes the map when the mobile device
 *  orientation changes  
 */
$(window).resize(function() {
    hideAddressBar();
    setTimeout(function(){
        fixMapHeight();
        refreshMap();
    }, 500);
});

/* Used to fix map height depending on device screen size */
function fixMapHeight() {
    var sh = window.innerHeight ? window.innerHeight : $(window).height();
    var bh = $('.page > header:first').height();
    var diff = sh - bh;
    
    $('#map-container').height(diff);
    $('#page1').height(sh);
}

/* Used to hide the nav bar */
function hideAddressBar() {
    //Fake mobile by increasing page height, so address bar can hide.
    var sh = window.innerHeight ? window.innerHeight : $(window).height();
    $('#page1').height(sh * 2);
    $('#map-container').height(sh * 2);
    
    var doc = $(document);
    var win = this;

    // If there's a hash, or addEventListener is undefined, stop here
    if( !location.hash && win.addEventListener ){
        window.scrollTo( 0, 1 );
    }
}

/* 
 * Matches the selected filters
 * with POIS categories
 */
function isFilterSelected(categories) {
    var found = false;
    $.each(categories, function(k, v){
        var filter = $.grep(filters, function (e){ return (e.name == v && e.selected) });
        
        if (filter.length == 1) {
            found = true;
            return false;
        }
    });

    if (found) return true;

    return false;
}

/* Matches the categories in the filters
 * with those of the POIS
 */
function matchCategories(arr1, arr2) {
    for (i = 0; i < arr1.length; i++) {
        for (j = 0; j < arr2.length; j++) {
            if (arr1[i] == arr2[j]) {
                return true;
            }
        }
    }
    return false;
}

/* Checks whether or not local storage is supported */
function supportsLocalStorage() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
}

/* Gets local variable's value */
function getLocalValue(key) {
    return localStorage.getItem(key);
    
}

/* Sets local variable's value */
function setLocalValue(key, value) {
    localStorage.setItem(key, value);
}

/* Empty local variable */
function removeLocalValue(key) {
    localStorage.removeItem(key);
}

/* Retrieve favourite value */
function getFavouriteValue(id) {
    return getLocalValue('favouritepois' + id)?true:false;
}
/* If local storage is supported show favourite button */
function showFavouriteButtons(id) {
    if (supportsLocalStorage()) {
        var favourite = getFavouriteValue(id);
        if (favourite) {
            $('#addFav').hide();
            $('#removeFav').show();
            $('#removeFav').attr('rel', id);
        } else {
            $('#addFav').show();
            $('#addFav').attr('rel', id);
            $('#removeFav').hide();
        }
        $('#page3 > footer').show();
    }
}
/* Older versions of android do not allow scroll for divs. 
 * Use the functions bellow to fix this bug. 
 */
function isTouchDevice(){
	try{
		document.createEvent("TouchEvent");
		return true;
	}catch(e){
		return false;
	}
}
function touchScroll(id){
    var versionRX = new RegExp(/Android [0-9]/);
    var versionS = new String(versionRX.exec(navigator.userAgent));
    var version = parseInt(versionS.replace("Android ", ""));

    if(isTouchDevice() && version < 4){ //if touch events exist and older than android 4
            var el=document.getElementById(id);
            var scrollStartPos=0;

            document.getElementById(id).addEventListener("touchstart", function(event) {
                    scrollStartPos=this.scrollTop+event.touches[0].pageY;
                    event.preventDefault();
            },false);

            document.getElementById(id).addEventListener("touchmove", function(event) {
                    this.scrollTop=scrollStartPos-event.touches[0].pageY;
                    event.preventDefault();
            },false);
    }
}

/*
 * Used to update filters object list with newly selected filters
 */
function setSelectedFilters(selected){
    $.each(filters, function(k, v){
        if ($.inArray(v.name, selected) > -1) {
            filters[k].selected = true;
        } else {
            filters[k].selected = false;
        }
    });
}