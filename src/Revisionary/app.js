$(document).on('ready', function (event) {

	var client,
		files_count,
		rev_client_key,
		$console = $('#console');

	$('#save-png').on('click', function (event) {

		var time = $.now();
		var db_id = $('#db-id').val();
		var db_token = $('#db-token').val();
		var save_and_copy = "$._ext_save_and_copy.run('"+time+"','"+db_id+"','"+db_token+"')";

		evalScript(save_and_copy, function (response) {
			displayUploading();
			$console.prepend('Saving ' + response + "\n");
		});
	});

	$('ul.items').on('click', 'a', function (event) {
		event.preventDefault();
		var is_copy = $(this).hasClass('copy');
		var clicked = $(this);
		if (is_copy) {
			clicked.html("copying…");
			clicked.parent().parent().parent().find('figure').spin('small','#3464EA');
			makeUrl(clicked.data('path'), function (url) {
				var copy_text_to_clipboard = "$._ext_copy_text_to_clipboard.run('"+url+"')";
				evalScript(copy_text_to_clipboard, function (response) {
					$console.prepend(response + "\n");
					clicked.html("done!");
					clicked.parent().parent().parent().find('figure').spin(false);
					setTimeout(function () {
						clicked.html("<span class='ss-icon ss-standard ss-link'></span> copy");
					}, 3000);
				});
			});
		} else {
			makeUrl($(this).data('path'), function (url) {
				window.cep.process.createProcess('/usr/bin/open', url);
			});
		}
	});

	$('#auth-db').on('click', function (event) {
		// generate key
		rev_client_key = Math.random().toString(36).substr(2);
		window.cep.process.createProcess('/usr/bin/open', 'http://localhost:3000/dropbox/auth_start/'+rev_client_key);
		setTimeout(function () {
			getAuthInfo(rev_client_key);
		},2000);
	});

	$('#save-settings').on('click', function (event) {
		var auth_uid = $('#db-id').val();
		var auth_token = $('#db-token').val();
		var auth_type = $('#db-token-type').val();
		var client_key = $('#rev-client-key').val();
		var save_settings = "$._ext_save_settings.run('"+auth_uid+"','"+auth_token+"','"+auth_type+"', '"+client_key+"')";
		evalScript(save_settings, function (response) {
			response = response.split(',');
			$console.prepend('Saved settings: ' + response + "\n");
			$('#db-id').val(response[0]);
			$('#db-token').val(response[1]);
			$('#db-token-type').val(response[2]);
			$('#rev-client-key').val(response[3]);
			$(window).trigger('save_settings');
		});
	});

	$('.toggle-settings').on('click', function (event) {
		$('#actions').toggle();
		$('#settings').toggle();
		$('#settings-button').toggle();
		$('#settings-done').toggle();
	});

	$(window).on('save_settings', function () {
		initClient();
	});

	$(window).on('client_initialized', function () {
		getAccountInfo();
		displayFiles();
		setInterval(function(){ getFileUrl(); }, 100);
	});

	function getAuthInfo(client_key) {
		var url = "http://localhost:3000/clients/"+client_key+".json";
		console.log("get auth info: "+url);
		$.get(url, function(data) {
		  console.log('done');
		  console.log(data);
		  if (data['access_token']) {
		  	$('#db-id').val(data['uid']);
				$('#db-token').val(data['access_token']);
				$('#db-token-type').val('');
				$('#rev-client-key').val(data['key']);
				$('#save-settings').trigger('click');
		  } else {
		  	console.log('retrying');
		  	setTimeout(function () {
					getAuthInfo(rev_client_key);
				}, 250);
		  }
		});
	}

	function displayUploading() {
		$('ul.items li.display_uploading').remove();
		$('ul.items').prepend("<li class='display_uploading'> \
															<figure class='loading'></figure> \
															<div class='info'> \
																<strong class='name'>Uploading revision…</strong> \
																<div class='meta'> \
																	<small>Good things are happening</small> \
																</div> \
															</div> \
														</li>");
		$('ul.items figure.loading').spin('large', '#fff');
	}

	function getFileUrl() {

		var get_file_status = "$._ext_get_file_status.run()";
		var clear_file_status = "$._ext_clear_file_status.run()";

		evalScript(get_file_status, function (response) {
			if (response != 'false') {
				evalScript(clear_file_status, function (r) {
					displayUploading();
				});
			}
		});

		var get_file_url = "$._ext_get_file_url.run()";
		var clear_file_url = "$._ext_clear_file_url.run()";

		evalScript(get_file_url, function (response) {
			if (response != 'false') {
				refreshFiles();
				var copy_text_to_clipboard = "$._ext_copy_text_to_clipboard.run('"+response+"')";
				evalScript(copy_text_to_clipboard, function (r) {
					$console.prepend('Copied ' + response + "\n");
					evalScript(clear_file_url);
				});
			}
		});
	}

	function initClient() {
		$console.prepend('Initializing…' + "\n");
		var auth_uid = $('#db-id').val();
		var auth_token = $('#db-token').val();
		if (auth_token.length > 0) {
			$('#actions').show();
			$('#settings').hide();
			$('#settings-button').show();
			$('#settings-done').hide();
			$('#console-settings').show();
			$('#footer').show();
			client = new Dropbox.Client({
		    key: "ohu15auk3qwy1za",
		    token: auth_token,
		    uid: auth_uid
			});
			$(window).trigger('client_initialized');
		} else {
			$('#settings').show();
			$('#connect-settings').show();
			$('#actions').hide();
			$('#console-settings').hide();
			$('#footer').hide();
		}
	}

	function getAccountInfo() {
		client.getAccountInfo(function(error, accountInfo) {
		  if (error) {
		  	$console.prepend('Error: ' + error + "\n");
		  }
		  $console.prepend("Connected as " + accountInfo.name + "\n");
		  $('#footer-wrap .ss-icon').addClass('active');
		  $('#footer-wrap #account').html('<span class="ss-icon active">Dropbox</span>&nbsp;<span class="name active">'+accountInfo.name+'</span>');
		});
	}

	function displayFiles() {
		getAllFiles(function (items,stats) {

			var files = stats.sort(sortModified).reverse();

			$.each(files, function (index,value) {
				$('ul.items').append("<li> \
																<figure class='loading'></figure> \
																<div class='info'> \
																	<strong class='name'><a href='#' class='preview' data-path='"+value.path+"'>"+ value.name +"</a></strong> \
																	<div class='meta'> \
																		<small>"+ value.modifiedAt +"</small> \
																	</div> \
																	<div class='controls'> \
																		<a href='#' class='copy' data-path='"+value.path+"'><span class='ss-icon ss-standard ss-link'></span> copy</a> \
																		&nbsp;•&nbsp; \
																		<a href='#' class='preview' data-path='"+value.path+"'><span class='ss-icon ss-standard ss-view'></span> preview</a> \
																	</div> \
																</div> \
															</li>");

				$('ul.items figure.loading').spin('large', '#fff');
				readThumbnail(value.path,index);
			});

		});
	}

	function refreshFiles() {
		client.readdir("/", function(error, entries, folder, stats) {
		  if (error) {
		    $console.prepend('Error: ' + error + "\n"); // Something went wrong.
		  }
		  var count = entries.length;
		  if (count > files_count) {
		  	displayFiles();
		  } else {
				setTimeout(function () {
					refreshFiles();
				}, 250);
			}
		});
	}

	function getAllFiles(callback) {
		client.readdir("/", function(error, entries, folder, stats) {
		  if (error) {
		    $console.prepend('Error: ' + error + "\n"); // Something went wrong.
		  }
		  files_count = entries.length;
		  $('ul.items').html('');
		  callback(entries,stats);
		});
	}

	function readThumbnail(file,index) {
		client.readThumbnail(file, { blob: true, png: true, size: 'large' }, function(error, data) {
		  if (error) {
		    $console.prepend('Error: ' + error + "\n");
		  }
		  // data is an ArrayBuffer instance holding the image.
		  var blob = new Blob([data]);
		  var url = (window.webkitURL || window.URL).createObjectURL(blob);
		  $('ul.items li:eq('+index+') figure').empty().append("<a href='#' class='preview' data-path='"+file+"'><img src=" + url + "></a>").removeClass('loading').spin(false);
		});
	}

	function makeUrl(file,callback) {
		client.makeUrl(file, { longUrl: true }, function(error, url) {
		  if (error) {
		    $console.prepend('Error: ' + error + "\n"); // Something went wrong.
		  }
		  callback(url.url);
		});
	}

	function sortModified(a,b) {
	  if (a.modifiedAt < b.modifiedAt)
	     return -1;
	  if (a.modifiedAt > b.modifiedAt)
	    return 1;
	  return 0;
	}

});
