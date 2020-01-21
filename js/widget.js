/**
 * Widget for jFormBuilder-2.0

 * @name FormWidget
 * @namespace
 */
window.FormWidget={};
FormWidget.create=function(formId, formAction, formTitle, formButton, formError, formPages, idtime, formNextButton, formBackButton){
	var form_html = '<form method="post" action="'+formAction+'" class="biznestream-form biznestream-form-'+formId+'" id="biznestream-form-'+formId+idtime+'" >';
	form_html += '<input type="hidden" name="source" value="'+formAction+'"/>';
	form_html += '<h3>'+formTitle+'</h3>';
	var hasPaypal = false;
	for(var i = 0; i < formPages.length; i++){
		var formData = formPages[i];
		var pageCount = formPages.length - 1;
		form_html += '<ul class="formPage" data-page-id="' + i + '">';
		for(var x = 0; x <= formData.length; x++){
			if(formData[x]){
				if (formData[x].type == 'paypal') {
                    hasPaypal = true;
				}
				form_html+='<li data-type="' + formData[x].type + '" class="form_element" style="display: list-item;" ' + (formData[x].phone_validation ? 'data-phone': '') + '>';
				form_html+='<div>';
				form_html+='<div class="form_label">';
				form_html += formData[x].icon ? '<img src="' + formData[x].icon +'">' : '';
				form_html += '<div class="name">' + formData[x].label + '</div>';
				if(formData[x].required != '0'){
					form_html += '<b class="requred">*</b>';
				}
				form_html += '</div>';
				form_html += '<div class="form_input">';
				form_html += formData[x].default_value
          .replace(/id="([^"]*)"(.*)type="checkbox"([^>]*)>/g, 'id="$1"$2type="checkbox"$3><label for="$1" style="display: none" class="c-indicator"></label>') // for customizing
          .replace(/id="([^"]*)"(.*)type="radio"([^>]*)>/g, 'id="$1"$2type="radio"$3><label for="$1" style="display: none" class="c-indicator"></label>') // for customizing
        ;
				form_html += '</div>';
				form_html += '</div>';
				form_html += '</li>';
			}
		}
		if (!hasPaypal) {
            form_html += '<li>';
            form_html += '<div class="form_label"></div>';
            form_html += '<div class="form_input">';
            form_html += '<button type="button" name="prev">' + (formBackButton ? formBackButton : ' &larr;') + '</button>';
            switch (pageCount) {
                case i:
                    form_html += '<button type="submit" name="submit">' + formButton + '</button>';
                    break;
                default:
                    form_html += '<button type="button" class="nextButton" name="next">' + (formNextButton ? formNextButton : ' &rarr;') + '</button>';
                    break;
            }
            form_html += '</div>';
            form_html += '</li>';
        }
        form_html += '</ul>';
	}
	form_html += '</form>';
	return form_html;
};