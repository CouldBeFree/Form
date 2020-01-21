(function(window, document, location, bzForms, $) {
  bzForms.paypalButtons = bzForms.paypalButtons || {};
  while (bzForms.length) {
    initForm(bzForms.pop());
  }

  function initForm(element) {
    var formElementId = element.form;
    var formElement;
    var currentPage = 0;
    var formPages = [];
    var formManifests = [];
    var times = [];
    var formData = {};
    var filledFormId = null;
    var filledFormTitle = null;
    var sending = false;
    var MAX_FILESIZE = 18874368;

    var validators = {
      required: function(data, value, $control, field) {
        return !!($.isArray(value) ? value.length : value);
      },
      phone: function(data, value, $control) {
        if (!value) {
          return true;
        }
        value = value.replace(/\s+/g, "");
        return value.length > 9 &&
          value.match(/^((\+[1-9]{1,4}[ \-]*)|(\([0-9]{2,3}\)[ \-]*)|([0-9]{2,4})[ \-]*)*?[0-9]{3,4}?[ \-]*[0-9]{3,4}?$/);
      },
      email: function(data, value, $control) {
        if (!value) {
          return true;
        }
        value = value.replace(/\s+/g, "");
        return value.length > 9 &&
          value.match(/^(([^<>()\[\].,;:\s@"]+(\.[^<>()\[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i);
      },
      file: function(data, value, $control) {
        var fullSize = 0;
        if ($control && $control[0]) {
          for (var i = 0; i < $control[0].files.length; i++) {
            fullSize += $control[0].files[i].size;
          }
        }
        return fullSize < MAX_FILESIZE;
      }
    };

    init();

    function setEnterCatchOnInputs() {
      $('input, select', formElement).keypress(function (e) {
        if (e.which == 13) {
          return false;
        }
      });
    }

    function initDataBinding() {
      for (var i = 0; i < element.pages.length; i++) {
        var page = element.pages[i];
        var manifest = { ui: {} };

        for (var j = 0; j < page.length; j++) {
          var field = page[j];
          var id = field.name;
          if (field.type === 'newstep') {
            continue;
          }
          if (field.type === 'radio') {
            manifest.ui['input[name="' + id + '"]'] = {
              bind: field.id,
              check: createValidationFunc(field)
            };
            $('input[name="' + id + '"]', formElement).click(function() {
              setTimeout(function() {
                $(formPages[currentPage]).trigger('recalc');
              }, 10);
            });
            continue;
          }
          if (field.type === 'checkbox') {
            manifest.ui['input[name="' + id + '"]'] = {
              bind: field.id,
              check: createValidationFunc(field)
            };
            $('input[name="' + id + '"]', formElement).click(function() {
              setTimeout(function() {
                $(formPages[currentPage]).trigger('recalc');
              }, 10);
            });
            continue;
          }
          /*if (field.type === 'date') {
            $('#' + id).pickadate({
              format: 'dd.mm.yyyy'
            });
          }*/
          manifest.ui['#' + id] = {
            bind: field.id,
            check: createValidationFunc(field)
          };
        }

        var paypalId = '#paypal-' + element.id;
        if (element.paypal && !bzForms.paypalButtons[paypalId]) {
          bzForms.paypalButtons[paypalId] = true;
          $(paypalId).html('');
          $.getScript("https://www.paypalobjects.com/api/checkout.js", function () {
            paypal.Button.render({
              env: element.paypal.env || 'sandbox',
              client: {
                sandbox: element.paypal.cliendId,
                production: element.paypal.cliendId
              },
              // https://developer.paypal.com/docs/api/payments/#payment_create
              payment: function (data, actions) {
                return actions.payment.create({
                  transactions: [
                    {
                      amount: {total: element.paypal.price, currency: 'EUR'}
                    }
                  ]
                });
              },
              commit: true,
              onAuthorize: function (data, actions) {
                return actions.payment.execute().then(function (response) {
                  submitForm({ paypal: response });
                });
              },
              style: {
                size: 'medium', // tiny, small, medium
                color: 'blue', // orange, blue, silver
                shape: 'rect'    // pill, rect
              },
              onCancel: function (data) {
              }
            }, paypalId);
          });
        }

        formManifests.push(manifest);

        if ($(formPages[i]).my){
          $(formPages[i]).my(manifest, formData);
        }
      }
    }

    function createValidationFunc(field) {
      return function validate(data, value, $control) {
        for (var i = 0; i < field.validators.length; i++) {
          var validatorName = field.validators[i];
          var validator = validators[validatorName];
          if (!validator) {
            throw new Error('Validator "' + validatorName + '" not found');
          }
          if (!validator(data, value, $control, field)) {
            return validatorName;
          }
        }
        return null;
      };
    }

    function initFormActions() {
      var actions = $('.form-actions', formElement);

      $('.backButton', actions).click(prevFormPage);
      $('.nextButton', actions).click(nextFormPage);
      $('.submitButton', actions).click(submitForm);
    }

    function submitForm(additionalFields) {
      hideErrors();
      if (!$(formPages[currentPage]).my('valid')) {
        showErrors();
        return false;
      }

      postCurrentData('done', additionalFields).then(function(response) {
        return response.json()
      }).then(function(res) {
        filledFormId = res._id;
        filledFormTitle = res.title;

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          'event' : 'formSubmissionSuccess',
          'formId' : element.id
        });

        if (typeof ga !== 'undefined') {
          ga('send', {
            hitType: 'event',
            eventCategory: 'form',
            eventAction: 'submit',
            eventLabel: filledFormTitle
          });
        }

        if (typeof fbq !== 'undefined') {
          fbq('track', 'FormSubmit', {
            content_type: filledFormId,
            content_name: filledFormTitle
          });
        }

        if (typeof gtag !== 'undefined') {
          gtag('event', 'SubmissionSuccess', {
            'event_category': 'Form',
            'event_label': filledFormId
          });
        } else if (typeof ga !== 'undefined') {
          ga('send', {
            hitType: 'event',
            eventCategory: 'Form',
            eventAction: 'SubmissionSuccess',
            eventLabel: filledFormId
          });
        }

        var el = $(formElement);
        if (res.message) {
          el.after(res.message);
        }
        el.remove();

        if (res.url) {
          setTimeout(function(){
            window.location = res.url;
          }, res.message ? 1500 : 500);
        }
      });

      return false;
    }

    function postCurrentData(state, additionalFields) {
      if (sending) {
        return;
      }
      var page = element.pages[currentPage];

      var data = new FormData();
      data.append('referer', location.href);
      data.append('state', state);
      data.append('userAgent', navigator.userAgent);
      data.append('additionalFields', JSON.stringify(additionalFields));
      if (filledFormId) {
        data.append('_id', filledFormId);
      }
      for (var j = 0; j < page.length; j++) {
        var field = page[j];
        var value = formData[field.id];

        if (field.type === 'uploader') {
          var input = $('#' + field.name).get(0);

          for (var i = 0; i < input.files.length; i++) {
            data.append(field.id, input.files[i]);
          }
        } else if (value) {
          data.append(field.id, JSON.stringify(value));
        }
      }
      loadingOn();
      sending = true;
      return fetch(element.endpoint, { method: 'POST', body: data }).then(function(data) {
        sending = false;
        loadingOff();
        return data;
      });
    }

    function hideErrors() {
      $('.error > div', formElement).addClass('hide');
    }

    function showErrors() {
      var errors = $(formPages[currentPage]).my('errors');
      var ids = Object.keys(errors);

      $('html, body').animate({
        scrollTop: $(ids[0]).offset().top
      }, 200);
      for (var i = 0; i < ids.length; i++) {
        var el = $(ids[i]).closest('.form_element');
        $('.error > div', el).addClass('hide');
        $('.error > div[data-type="' + errors[ids[i]] + '"]', el).removeClass('hide');
      }
    }

    function nextFormPage() {
      hideErrors();
      if (!$(formPages[currentPage]).my('valid')) {
        showErrors();
        return;
      }

      postCurrentData(currentPage + 1 /* base 0 */).then(function(response) {
        return response.json()
      }).then(function(res) {
        filledFormId = res._id;
        filledFormTitle = res.title;

        if (typeof ga !== 'undefined') {
          ga('send', {
            hitType: 'event',
            eventCategory: 'form',
            eventAction: 'step-click-' + currentPage,
            eventLabel: filledFormTitle
          });
        }
        if (typeof fbq !== 'undefined') {
          fbq('track', 'FormStep(' + currentPage + ')', {
            content_type: filledFormId,
            content_name: filledFormTitle
          });
        }
        console.info('response', res);
        if (res.times) {
          times = res.times;
          var el = $('#' + element.pages[1][0].name);
          var html = times.map(function(item) { return '<option>' + item + '</option>'; }).join("\n");
          el.show().html(html);
          $('.reservation-error', formElement).remove();
          $('.nextButton',  $('.form-actions', formElement)).show();
        }
        if (res.message) {
          var el = $('#' + element.pages[1][0].name);
          el.hide().after('<div class="reservation-error">' + res.message + '</div>');
          $('.nextButton',  $('.form-actions', formElement)).hide();
        }
        if (res.error) {
          var el = $('#' + element.pages[1][0].name);
          el.hide().after('<div class="reservation-error">' + res.error + '</div>');
          $('.nextButton',  $('.form-actions', formElement)).hide();
        }
      });

      $(formPages[currentPage]).hide().removeClass('show');
      currentPage++;
      $(formPages[currentPage]).addClass('show');
    }

    function prevFormPage() {
      $('.nextButton',  $('.form-actions', formElement)).show();
      $(formPages[currentPage]).hide().removeClass('show');
      currentPage--;
      $(formPages[currentPage]).addClass('show');
    }

    function loadingOn() {
      $('input,select,textarea', formElement).prop('disabled', true);
      $('.bz-form-overlay', formElement).show();
    }

    function loadingOff() {
      $('input,select,textarea', formElement).prop('disabled', false);
      $('.bz-form-overlay', formElement).hide();
    }

    function onSuccessElementFound() {
      formPages = $('.formPage', formElement);
      setEnterCatchOnInputs();
      initDataBinding();
      initFormActions();
    }

    function onElementNotFound() {
      throw new Error('Element with id "' + formElementId + '" not found');
    }

    function init() {
      formElement = document.getElementById(formElementId);

      if (formElement) {
        return onSuccessElementFound();
      }
      document.addEventListener("DOMContentLoaded", function() {
        formElement = document.getElementById(formElementId);

        if (formElement) {
          return onSuccessElementFound();
        }
        return onElementNotFound();
      });
    }
  }
})(window, document, location, window.bzForms, jQuery.noConflict());
