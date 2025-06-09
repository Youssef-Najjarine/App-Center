let updateProfileInfo = function() {};
$(document).ready(function () {
  let currentUser = null;
  let imageModified = false;  // Flag to track if the image input was modified
  let demoModified = false;
  let apps = [];
  // Check if the user is already remembered (by JWT token)
  const token = localStorage.getItem('OAPauthToken');
  if (token) {
    // Auto-login or perform actions with the stored token
    console.log('User is remembered with token:', token);

    // Send the token to the server to validate the session and retrieve user info
    $.ajax({
      url: '/api/validate-token',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ token }),
      success: function(response) {
        // Retrieve user data, password length, and apps from the response
        const userData = response.user;
        const userApps = response.apps || []; // Ensure apps is an array, even if it's not provided
        // Save the user data to the global variable currentUser
        currentUser = {
          ...userData
        };
        updateMyProfileApps(userApps);
        console.log('Current user: ', currentUser);
        updateProfileInfo();
        $('.logIn').hide();
        $('.profile-icon-div').show();
      },
      error: function(xhr, status, error) {
        console.error('Failed to validate token:', xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error');
        // Optionally, you can log out the user by removing the token if it's invalid
        localStorage.removeItem('OAPauthToken');
      }
    });
  }
  $('#apps-modal-loading').show();
  // Create a lightweight virtual DOM representation
  function createVirtualApp(app) {
    return {
      OwnerUserId: app.OwnerUserId,
      Id: app.Id,
      DisplayName: app.DisplayName,
      TagLine: app.TagLine,
      Description: app.Description,
      TechnologyListCsv: app.TechnologyListCsv,
      ConclusionSummary: app.ConclusionSummary,
      RepositoryUrl: app.RepositoryUrl,
      PreviewImageFile: app.PreviewImageFile,
      DemonstrationVideoFile: app.DemonstrationVideoFile
    };
  }
  function retrieveAllAppData() {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: '/api/list-apps',
        method: 'GET',
        success: function(data) {
          console.log('data: ', data);
          apps = data.map(createVirtualApp);
          renderApplicationsBatched(apps);
          console.log('apps: ', apps);
          $('#apps-modal-loading').hide();
          resolve(apps);
        },
        error: function(xhr, status, error) {
          console.error('Error retrieving app data:', error);
          reject(error);
        }
      });
    });
  }
  retrieveAllAppData();
  function renderApplicationsBatched(apps, batchSize = 20) {
    const template = document.querySelector('#templates .appHome');
    const container = document.querySelector('#applications .grid');
    let index = 0;
    function renderBatch() {
      const fragment = document.createDocumentFragment();
      const endIndex = Math.min(index + batchSize, apps.length);
  
      for (; index < endIndex; index++) {
        const app = apps[index];
        const newApp = template.cloneNode(true);
        console.log('app: ', app);
        newApp.setAttribute('data-appId', app.Id);
        if (!app.PreviewImageFile) newApp.querySelector('.img-fluid').remove();
        else newApp.querySelector('.img-fluid').src = app.PreviewImageFile;
        if (!app.DemonstrationVideoFile) newApp.querySelector('.demo').remove();
        else newApp.querySelector('.demo').src = app.DemonstrationVideoFile;
        if ([null,undefined].includes(app.RepositoryUrl)) newApp.querySelector('.RepositoryUrl').remove();
        else newApp.querySelector('.RepositoryUrl').href = app.RepositoryUrl;          
        newApp.querySelector('h2.w-title').textContent = app.DisplayName;
        newApp.querySelector('.w-ctegory').textContent = app.TagLine;
        newApp.querySelector('.appDispDesc').textContent = app.Description;
        if (app.TechnologyListCsv.length) {
          app.TechnologyListCsv.forEach(function(el) {
            const li = document.createElement('li');
            li.textContent = el;
            newApp.querySelector('.tech-stack ul').append(li);
          })
        }
        newApp.querySelector('.appsConclusion p').textContent = app.ConclusionSummary;
        fragment.appendChild(newApp);
      }
  
      container.appendChild(fragment);
  
      if (index < apps.length) {
        requestAnimationFrame(renderBatch);
      }
    }
    requestAnimationFrame(renderBatch);
  }
  $('#cancel-upload-new-app').click(function() {
    $('#my-app-upload').hide();
    $('#my-profile-apps,#my-profile-new-app').show();
    $(".my-profile-apps").addClass("active");
  })
  $('#upload-new-app').click(function() {
    appEntryVerification('upload-new',
      $('#upload-new-app-name').val(),
      $('#upload-new-app-tag-line').val(),
      $('#upload-new-app-short-desc').val(),
      $('#upload-new-app-tech-stack').val(),
      $('#upload-new-app-conclusion').val(),
      $('#upload-new-app-repo-link').val());
  })
  // Handling the form submission
  $('#upload-new-app-form').submit(async function (e) {
    e.preventDefault();
    $('#upload-app-modal-loading').show();

    // Fetch image from input or use placeholder if none is uploaded
    let image = $('#upload-new-app-image')[0].files[0];

    // If no image is uploaded, use the placeholder image
    if (!image) {
        image = await getPlaceholderImage();
    }

    const demo = $('#upload-new-app-demo')[0].files[0];

    try {
        // Run image and video compression in parallel, both are optional
        const [compressedImageBlob, compressedVideoBlob] = await Promise.all([
            compressImage(image, 800, 600, 0.7),  // Compress image if available
            compressVideo(demo, 5 * 1024 * 1024)  // Compress video if available
        ]);

        // Prepare FormData for submission
        const formData = new FormData();

        // Append compressed image if available
        if (compressedImageBlob) {
            const compressedImage = new File([compressedImageBlob], image.name, { type: compressedImageBlob.type });
            formData.append('PreviewImageFile', compressedImage);  // Append the compressed image with correct file name
        }

        // Append compressed video if available
        if (compressedVideoBlob) {
            const compressedVideo = new File([compressedVideoBlob], demo.name, { type: compressedVideoBlob.type });
            formData.append('DemonstrationVideoFile', compressedVideo);  // Append the compressed video with correct file name
        }

        // Append other form data
        formData.append('OwnerUserId', currentUser.Id);
        formData.append('DisplayName', $('#upload-new-app-name').val());
        formData.append('TagLine', $('#upload-new-app-tag-line').val());
        formData.append('Description', $('#upload-new-app-short-desc').val());
        formData.append('TechnologyListCsv', $('#upload-new-app-tech-stack').val());
        formData.append('ConclusionSummary', $('#upload-new-app-conclusion').val());
        formData.append('RepositoryUrl', $('#upload-new-app-repo-link').val());
        formData.append('Price', '5');
        console.log('Image in form data: ', formData.get('PreviewImageFile'));
        // Send FormData to the server
        const response = await fetch('/api/create-app', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            $('#danger-creating-app').show();
            throw new Error('Failed to create app');
        }

        const result = await response.json();
        console.log('result: ', result);

        let myProfileApp = $('#templates .my-profile-app-to-display').clone();
        myProfileApp.attr('data-appId', result.data.Id);
        myProfileApp.find('h2').html(result.data.DisplayName);
        myProfileApp.find('img').attr({
            'src': result.data.PreviewImageFile,
            'crossorigin': 'anonymous'
        });
        $('#my-profile-apps').append(myProfileApp);

        let newHomeApp = $('#templates .appHome').clone();
        newHomeApp.attr('data-appId', result.data.Id);
        newHomeApp.find('.img-fluid').attr({
            'src': result.data.PreviewImageFile,
            'crossorigin': 'anonymous'
        });
        if (!formData.get('DemonstrationVideoFile')) {
            newHomeApp.find('.demo').remove();
        } else {
            newHomeApp.find('.demo').attr({
                'src': result.data.DemonstrationVideoFile,
                'crossorigin': 'anonymous'
            });
        }
        if (!formData.get('RepositoryUrl').trim()) {
            newHomeApp.find('.RepositoryUrl').remove();
        } else {
            newHomeApp.find('.RepositoryUrl').attr('href', result.data.RepositoryUrl);
        }
        newHomeApp.find('h2.w-title').html(result.data.DisplayName);
        newHomeApp.find('.w-ctegory').html(result.data.TagLine);
        newHomeApp.find('.appDispDesc').html(result.data.Description);
        if (result.data.TechnologyListCsv.length) {
          result.data.TechnologyListCsv.forEach(function (el) {
            newHomeApp.find('.tech-stack ul').append(`<li>${el}</li>`);
          });
        }
        newHomeApp.find('.appsConclusion p').html(result.data.ConclusionSummary);
        $('#applications .grid').append(newHomeApp);
        apps.push(result.data);
        console.log('New Apps: ', apps);
        $('#upload-new-app-form')[0].reset();
        $('#upload-app-modal-loading').hide();
        $('#my-profile-apps,#my-profile-new-app').show();
        $('#my-profile-settings,#my-app-upload').hide();
        $(".my-profile-apps").addClass("active");
    } catch (error) {
        console.error('Error processing files:', error);
        $('#upload-app-modal-loading').hide();
    }
  });
  $(document).on('click', '.my-profile-app-to-display',function() {
    imageModified = false;  // Flag to track if the image input was modified
    demoModified = false; // Flag to track if the demo input was modified
    $(`#my-profile-apps,#my-profile-new-app,#upload-new-app-form,
      #update-app-image-preview,#update-app-demo-preview,
      #update-repo-danger,#update-app-form .danger,
      #update-danger-creating-app`).hide();
    $(".my-profile-apps").removeClass("active");
    $('#my-app-upload,#update-app-form').show();
    const curAppId = $(this).attr('data-appId');
      for (let i=0; i < apps.length;i++) {
        if (apps[i].Id === curAppId) {
          $('#update-app-form').attr('data-appId',curAppId);
          $('#update-app-name').val(apps[i].DisplayName);
          $('#update-app-tag-line').val(apps[i].TagLine);
          $('#update-app-short-desc').val(apps[i].Description);
          $('#update-app-tech-stack').val(apps[i].TechnologyListCsv);
          $('#update-app-conclusion').val(apps[i].ConclusionSummary);
          $('#update-app-repository-url').val(apps[i].RepositoryUrl);
          $('#update-app-image,#update-app-demo').val('');
          if (apps[i].PreviewImageFile) {
            $('#update-app-image-preview').attr('src',apps[i].PreviewImageFile);
            $('#update-app-image-preview,#update-image-X').show();
          } else $('#update-app-image-preview,#update-image-X').hide();
          if (apps[i].DemonstrationVideoFile) {
            $('#update-app-demo-preview').attr('src',apps[i].DemonstrationVideoFile);
            $('#update-app-demo-preview,#update-demo-X').show();
          } else $('#update-app-demo-preview,#update-demo-X').hide();
          break;
        }
      }
  })
  $('#update-app-image').on('change', function() {
    imageModified = true;
    // Get the selected file
    let file = this.files[0];
    // Ensure that a file is selected and it is an image
    if (file && file.type.startsWith('image/')) {
      let reader = new FileReader();
      // When the file is read, update the src of the image preview
      reader.onload = function(e) {
          $('#update-app-image-preview').attr('src', e.target.result);
          $('#update-app-image-preview,#update-image-X').show();  // Make the image visible if hidden
      };
      // Read the image file as a Data URL
      reader.readAsDataURL(file);
    } else {
        $('#update-app-image-preview,#update-image-X').hide();  // Hide the image preview if the file is not an image
    }
  })
  $('#update-app-demo').on('change', function() {
    demoModified = true;
    // Get the selected file
    const file = this.files[0];
    // Ensure that a file is selected and it is a video
    if (file && file.type.startsWith('video/')) {
      const videoURL = URL.createObjectURL(file);
      $('#update-app-demo-preview').attr('src',videoURL);
      $('#update-app-demo-preview,#update-demo-X').show();
    } else {
      $('#update-app-demo-preview,#update-demo-X').hide();  // Hide the video preview if the file is not a video
    }
  })
  $('#update-image-X').click(function() {
    imageModified = true;
    $('#update-app-image-preview').attr('src', '');
    $('#update-app-image').val('');
    $('#update-app-image-preview,#update-image-X').hide();
  })
  $('#update-demo-X').click(function() {
    demoModified = true;
    $('#update-app-demo-preview').attr('src', '');
    $('#update-app-demo').val('');
    $('#update-app-demo-preview,#update-demo-X').hide();
  })
  $('#update-app').click(function() {
    appEntryVerification('update',
      $('#update-app-name').val(),
      $('#update-app-tag-line').val(),
      $('#update-app-short-desc').val(),
      $('#update-app-tech-stack').val(),
      $('#update-app-conclusion').val(),
      $('#update-app-repository-url').val());
  })
  $('#update-app-form').submit(async function (e) {
    e.preventDefault();
    $('#update-app-modal-loading').show();

    let image = $('#update-app-image')[0].files[0];
    if (imageModified && !image) {
        image = await getPlaceholderImage();
    }

    const demo = $('#update-app-demo')[0].files[0];

    try {
        const [compressedImageBlob, compressedVideoBlob] = await Promise.all([
            imageModified ? compressImage(image, 800, 600, 0.7) : null,
            demoModified ? compressVideo(demo, 5 * 1024 * 1024) : null
        ]);

        const formData = new FormData();

        if (imageModified) {
            if (compressedImageBlob) {
                const compressedImage = new File([compressedImageBlob], image.name, { type: compressedImageBlob.type });
                formData.append('PreviewImageFile', compressedImage);
            } else {
                formData.append('PreviewImageFile', 'null');
            }
        }
        console.log('demoModified: ', demoModified);
        console.log('compressedVideoBlob: ', compressedVideoBlob);
        if (demoModified) {
          if (compressedVideoBlob) {
              const compressedVideo = new File([compressedVideoBlob], demo.name, { type: compressedVideoBlob.type });
              formData.append('DemonstrationVideoFile', compressedVideo);
          } else {
              formData.append('DemonstrationVideoFile', 'null');
          }
        }

        formData.append('OwnerUserId', currentUser.Id);
        formData.append('Id', $('#update-app-form').attr('data-appId'));
        formData.append('DisplayName', $('#update-app-name').val());
        formData.append('TagLine', $('#update-app-tag-line').val());
        formData.append('Description', $('#update-app-short-desc').val());
        formData.append('TechnologyListCsv', $('#update-app-tech-stack').val());
        formData.append('ConclusionSummary', $('#update-app-conclusion').val());
        formData.append('RepositoryUrl', $('#update-app-repository-url').val());

        const response = await fetch(`/api/update-app/${$('#update-app-form').attr('data-appId')}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to update app');
        }

        const result = await response.json();
        console.log('Updated App result: ', result);

        $('#update-app-modal-loading').hide();

        const cacheBuster = `?t=${new Date().getTime()}`; // Cache buster for updated image

        // Update UI to reflect updated app data
        let updatedApp = $('#my-profile-apps').find(`[data-appId="${result.data.Id}"]`);
        updatedApp.find('h2').html(result.data.DisplayName);
        updatedApp.find('img').attr('src', result.data.PreviewImageFile + cacheBuster);

        // Update new home app display
        let homeApp = $('#applications .grid').find(`[data-appId="${result.data.Id}"]`);
        homeApp.find('.img-fluid').attr('src', result.data.PreviewImageFile + cacheBuster);

        if (!result.data.DemonstrationVideoFile) {
            homeApp.find('.demo').remove();
        } else {
            let demoElement = homeApp.find('.demo');
            if (demoElement.length === 0) {
                demoElement = $('<video class="demo hidden" crossorigin="anonymous" controls></video>');
                homeApp.find('.work-content .col-12').prepend(demoElement);
            }
            demoElement.attr('src', result.data.DemonstrationVideoFile);
        }

        if (!result.data.RepositoryUrl.trim()) {
          homeApp.find('.RepositoryUrl').remove();
      } else {
          let repoElement = homeApp.find('.RepositoryUrl');
          
          // Check if the RepositoryUrl element exists; if not, create it
          if (repoElement.length === 0) {
              repoElement = $(`
                <a class="RepositoryUrl" href="" target="_blank">
                  <svg viewBox="0 0 250 250" aria-hidden="true">
                    <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
                    <path
                      d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2"
                      fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path>
                    <path
                      d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z"
                      fill="currentColor"></path>
                  </svg>
                </a>
              `);
              homeApp.find('.height-forty').prepend(repoElement);
          }
      
          // Set or update the href attribute for RepositoryUrl
          repoElement.attr('href', result.data.RepositoryUrl);
      }

        homeApp.find('h2.w-title').html(result.data.DisplayName);
        homeApp.find('.w-ctegory').html(result.data.TagLine);
        homeApp.find('.appDispDesc').html(result.data.Description);
        homeApp.find('.tech-stack ul').html('');

        if (result.data.TechnologyListCsv.length) {
            result.data.TechnologyListCsv.forEach(function (el) {
                homeApp.find('.tech-stack ul').append(`<li>${el}</li>`);
            });
        }

        homeApp.find('.appsConclusion p').html(result.data.ConclusionSummary);

        const appIndex = apps.findIndex(app => app.Id === result.data.Id);
        if (appIndex !== -1) {
            apps[appIndex] = { ...apps[appIndex], ...result.data };
            console.log('Updated Apps Array:', apps);
        }
        $('#update-app-form')[0].reset();
        $('#my-profile-apps,#my-profile-new-app').show();
        $('#my-profile-settings,#my-app-upload,#update-app-form').hide();
        $(".my-profile-apps").addClass("active");
    } catch (error) {
        console.error('Error updating the app:', error);
        $('#update-app-modal-loading').hide();
    }
});
  $('#delete-app').click(function() {
    const appId = $('#update-app-form').attr('data-appId');
    if (confirm('Are you sure you want to delete this app?')) {
        $('#update-app-modal-loading').show();
        fetch(`/api/delete-app/${appId}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log(data.message);
            // Remove the app from the UI
            $(`#my-profile-apps [data-appId="${appId}"]`).remove();  // Remove from profile
            $(`#applications .grid [data-appId="${appId}"]`).remove();  // Remove from home grid
            // Remove the app from the global 'apps' array
            const appIndex = apps.findIndex(app => app.appId === appId);
            if (appIndex !== -1) apps.splice(appIndex, 1);
            $('#update-app-modal-loading').hide();
            $('#my-profile-apps,#my-profile-new-app').show();
            $('#my-profile-settings,#my-app-upload,#update-app-form').hide();
            $(".my-profile-apps").addClass("active");
        })
        .catch(error => {
            $('#update-app-modal-loading').hide();
            $('#my-profile-apps,#my-profile-new-app').show();
            $('#my-profile-settings,#my-app-upload,#update-app-form').hide();
            $(".my-profile-apps").addClass("active");
            console.error('Error deleting app:', error);
            alert('An error occurred while deleting the app');
        });
    }
  });
  $('#save-my-profile-info').click(function() {
    let allowSbmt = 0;
    let validatedEmail = false;
    let validatedUsername = false;
    let validatedPassword = false;
    const firstName = $('#update-account-firstName').val();
    const lastname =  $('#update-account-lastName').val();
    const email = $('#update-account-email').val();
    const userName = $('#update-account-username').val();
    const password = $('#update-account-password').val();
    const PersonalDescription = $('#update-account-bio').val();
    if (firstName.trim()) ++allowSbmt;
    if (lastname.trim()) ++allowSbmt;
    if (email.trim()) ++allowSbmt;
    if (userName.trim() && !userName.includes(' ')) ++allowSbmt;
    if (password.trim()) ++allowSbmt;
    if (!validateEmail(email)) $('#updateEmailError').show();
    else {
      validatedEmail = true;
      $('#updateEmailError').hide();
    }
    if (!validateUsername(userName)) $('#updateUsernameError').show();
    else {
      validatedUsername = true;
      $('#updateUsernameError').hide();
    }
    if (!validatePassword(password)) $('#updatePasswordError').show();
    else {
      validatedPassword = true;
      $('#updatePasswordError').hide();
    }
    if (allowSbmt === 5 && validatedEmail && validatedUsername && validatedPassword) {
      $('#update-my-profile-info-form .danger').hide();
      $('#update-my-profile-info-form').submit();
    } else $('#update-my-profile-info-form .danger').show();
  })
  $('#update-my-profile-info-form').submit(function(e) {
    e.preventDefault();
    $('#update-account-modal-loading').show();

    const Id = currentUser.Id;
    const FirstName = $('#update-account-firstName').val();
    const LastName = $('#update-account-lastName').val();
    const EmailAddress = $('#update-account-email').val();
    const Username = $('#update-account-username').val();
    const password = $('#update-account-password').val();
    const PersonalDescription = $('#update-account-bio').val();

    const userData = {
      Id: Id,
      name: `${FirstName} ${LastName}`,
      FirstName,
      LastName,
      EmailAddress,
      Username,
      password,
      PersonalDescription
    };

    $.ajax({
        url: `/api/update-user/${Id}`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(userData),
        success: function(data) {
            const { user } = data;
            currentUser = user;  // Update global currentUser
            console.log('New current user Info: ', currentUser);
            updateProfileInfo();  // Update profile info on the page

            $('#update-account-modal-loading,#danger-updating-account,.update-my-profile-info').hide();
            $('.my-profile-personals').show();
        },
        error: function(xhr, status, error) {
            $('#update-account-modal-loading').hide();
            $('#danger-updating-account').show();
            console.error("Error updating account:", error);
        }
    });
  });
  $('#submit-password-reset').click(function() {
    $('#forgot-password-loading').show();
    const forgotPasswordUsernameEmail = $('#forgot-password-username-email').val();
    if (!forgotPasswordUsernameEmail.trim()) {
      $('#forgot-password-div .reqFieldMissing').show();
      $('#forgot-password-loading').hide();
    } else {
      $('#forgot-password-div .reqFieldMissing').hide();
      $('#forgot-password-form').submit();
    }
  })
  $('#forgot-password-form').submit(function(e) {
    e.preventDefault();
    const forgotPasswordUsernameEmail = $('#forgot-password-username-email').val();
    $.ajax({
      url: '/api/request-password-reset',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ identifier: forgotPasswordUsernameEmail }),
      success: function(response) {
        $('#forgot-password-div,#forgot-password-loading').hide();
        $('#passwordResetSubmitted').show();
        console.log('Password reset link sent:', response.message);
      },
      error: function(xhr) {
        $('#forgot-password-loading').hide();
        $('.errorSendingPasswordReset').show();
        console.error('Error:', errorMessage);
      }
  });

  })
  $('#login').click(function() {
    let allowSbmt = 0;
    const userEmail = $('#login-user-email').val();
    const password = $('#login-password').val();
    if (userEmail.trim()) ++allowSbmt;
    if (password.trim()) ++allowSbmt;
    if (allowSbmt == 2) {
      $('#login-form .danger').hide();
      $('#login-form').submit();
    } else return $('#login-form .danger').show();
  });
  $('#login-form').submit(function(e) {
    e.preventDefault();
    $('#login-form .danger,#wrong-login-danger,#email-not-verified-danger').hide();
    $('#login-modal-loading').show();

    const loginData = {
        login: $('#login-user-email').val(),  // Username or email
        password: $('#login-password').val(),
        rememberMe: $('#remember-me-login').is(':checked')
    };

    const rememberMe = $('#remember-me-login').is(':checked');

    // Send login data to the server
    $.ajax({
        url: '/api/login',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(loginData),
        success: function(response) {
          console.log('response: ', response);
            const token = response.token;  // The JWT token
            currentUser = response.user;
            if (rememberMe) {
              // Store the token in local storage for auto-login
              localStorage.setItem('OAPauthToken', token);
            }

            // Proceed with updating UI for a logged-in user
            $('#login-modal-loading,.logIn').hide();
            $('.profile-icon-div').show();
            $('#login-container').toggle('active');
            $('body').css('overflow', 'auto');
            console.log('currentUser: ', currentUser);
            updateProfileInfo();
            updateMyProfileApps(apps);
        },
        error: function(xhr, status, error) {
          const validCredentials = xhr.responseJSON.validCredentials;
          const IsEmailAddressVerified = xhr.responseJSON.IsEmailAddressVerified;
          console.log('xhr: ', xhr);
          if (!validCredentials) $('#wrong-login-danger').show();
          else $('#wrong-login-danger').hide();
          if (!IsEmailAddressVerified) $('#email-not-verified-danger').show();
            else $('#email-not-verified-danger').hide();
            $('#login-modal-loading').hide();
        }
    });
  });
  $('#log-out').click(function() {
    localStorage.removeItem('OAPauthToken');
    currentUser = null;
    console.log('Current User After Logging Out: ', currentUser);
    $(".profileBackdropSec").toggle("active");
    $('.profile-icon-div').hide();
    $('.logIn').show();
    $('body').css('overflow', 'auto');
  })
  $('#delete-account').click(function() {
    if (confirm('Are you sure you want to delete this user and all associated apps?')) {
      $.ajax({
        url: `/api/delete-user/${currentUser.Id}`,
        type: 'DELETE',
        success: function(response) {
          console.log(response.message);
          // Step 1: Remove associated apps from the global 'apps' array
          const appsToRemove = apps.filter(app => app.OwnerUserId === currentUser.Id);
          
          // Step 2: Remove associated apps from the UI
          appsToRemove.forEach(app => {
            const curAppId = app.Id;
            // Remove the app from the home grid (application grid)
            $(`#applications .grid [data-appId="${curAppId}"]`).remove();
            $(`#my-profile-apps [data-appId="${curAppId}"]`).remove();  // Remove from profile
          });
  
          // Step 3: Update the global 'apps' array by removing the deleted apps
          apps = apps.filter(app => app.OwnerUserId !== currentUser.Id);
          console.log('Updated apps array:', apps);
          localStorage.removeItem('OAPauthToken');
          currentUser = null;
          $(".profileBackdropSec").toggle("active");
          $("body").css("overflow", "auto");
          $('.logIn').show();
          $('.profile-icon-div').hide();
        },
        error: function(error) {
          console.error('Error deleting user:', error);
          alert('Failed to delete user.');
        }
      });
    }
  })
  $('#create-account-password').keyup(function() {
    const password = $('#create-account-password').val();
    const passwordFeedback = $('#passwordError');
    if (password.length < 8) {
      passwordFeedback.show();
      passwordFeedback.html('Password must be at least 8 characters long.');
    } else if (!/[A-Z]/.test(password)) {
      passwordFeedback.show();
      passwordFeedback.html('Password must contain at least one uppercase letter.');
    } else if (!/[a-z]/.test(password)) {
      passwordFeedback.show();
      passwordFeedback.html('Password must contain at least one lowercase letter.');
    } else if (!/\d/.test(password)) {
      passwordFeedback.show();
      passwordFeedback.html('Password must contain at least one number.');
    } else if (!/[!@#$%^&*]/.test(password)) {
      passwordFeedback.show();
      passwordFeedback.html('Password must contain at least one special character.');
    } else {
      passwordFeedback.hide();
      passwordFeedback.html('');
    }
  });
  $('#create-account').click(function() {
    $('#danger-creating-account').hide();
    let allowSbmt = 0;
    let validatedEmail = false;
    let validatedUsername = false;
    let validatedPassword = false;
    const firstName = $('#create-account-firstName').val();
    const lastname =  $('#create-account-lastName').val();
    const email = $('#create-account-email').val();
    const userName = $('#create-account-username').val();
    const password = $('#create-account-password').val();
    if (firstName.trim()) ++allowSbmt;
    if (lastname.trim()) ++allowSbmt;
    if (email.trim()) ++allowSbmt;
    if (userName.trim() && !userName.includes(' ')) ++allowSbmt;
    if (password.trim()) ++allowSbmt;
    if (allowSbmt === 5) $('#create-account-form .danger').hide();
    else return $('#create-account-form .danger').show();
    if (!validateEmail(email)) $('#emailError').show();
    else {
      validatedEmail = true;
      $('#emailError').hide();
    }
    if (!validateUsername(userName)) $('#usernameError').show();
    else {
      validatedUsername = true;
      $('#usernameError').hide();
    }
    if (!validatePassword(password)) $('#passwordError').show();
    else {
      validatedPassword = true;
      $('#passwordError').hide();
    }
    if ((allowSbmt === 5) && validatedEmail && validatedUsername && validatedPassword) $('#create-account-form').submit();
  })
  $('#create-account-form').submit(function(e) {
    e.preventDefault();
    $('#create-account-modal-loading').show();
    
    // Get form values
    const FirstName = $('#create-account-firstName').val();
    const LastName = $('#create-account-lastName').val();
    const EmailAddress = $('#create-account-email').val();
    const Username = $('#create-account-username').val();
    const password = $('#create-account-password').val();
    
    // Get the value of the "Remember Me" checkbox
    const rememberMe = $('#remember-me-create').is(':checked');
    
    // Create the full name
    const fullName = `${FirstName} ${LastName}`;
    
    // Prepare the profile data object to send to the server
    var profileData = {
      Name: fullName,  // Include the full name
      FirstName: FirstName,
      LastName: LastName,
      EmailAddress: EmailAddress,
      Username: Username,
      password: password,
      rememberMe: rememberMe,
      PersonalDescription: '' // Default bio is empty
    };
    // AJAX request to create the user
    $.ajax({
      url: '/api/create-user',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(profileData),
      success: function(response) {
        // Hide the loading modal
        $('#create-account-modal-loading').hide();



        if (rememberMe) {
          localStorage.setItem('OAPauthToken', response.token);
        }
        $('#create-account-div').hide();
        $('#verifyNewAccount').show();
      },
      error: function(xhr, status, error) {
        // Hide loading modal
        $('#create-account-modal-loading').hide();
        $('#danger-creating-account').show();
        // Handle duplicate email or username errors
        const response = xhr.responseJSON;
        if (response && response.error === 'Email already exists') {
          alert('The email you entered is already registered.');
        } else if (response && response.error === 'Username already exists') {
          alert('The username you entered is already taken.');
        } else {
          alert('Error creating account. Please try again.');
        }
      }
    });
  });
  function validatePassword(password) {
    const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    return regex.test(password);
  }
  function validateUsername(username) {
    const regex = /^[a-zA-Z0-9._-]{3,15}$/;
    return regex.test(username);
  }
  function validateEmail(email) {
    const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    return regex.test(email);
  }
  function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;  // Invalid URL
    }
  }
  function appEntryVerification(type,appName,headerPhrase,shortDesc,techStack,conclusion,RepositoryUrl) {
    let allowSbmt = 0;
    let allowSbmt2 = true;
    let validGitHubURL = true;
    let curAppId;
    if (type === 'update') {
      curAppId = $('#update-app-form').attr('data-appId');
    }
    if (RepositoryUrl.trim()) {
      if (!isValidURL(RepositoryUrl)) {
        validGitHubURL = false;
        if (type === 'upload-new') $('#repo-danger').show();
        else $('#update-repo-danger').show();
      } else  {
        validGitHubURL = true;
        if (type === 'upload-new') $('#repo-danger').hide();
        else $('#update-repo-danger').hide();
      }
    }
    if (appName.trim()) ++allowSbmt;
    if (headerPhrase.trim()) ++allowSbmt;
    if (shortDesc.trim()) ++allowSbmt;
    if (techStack.trim()) ++allowSbmt;
    if (conclusion.trim()) ++allowSbmt;
    if (allowSbmt === 5) {
      if (type === 'upload-new') $('#upload-new-app-form .danger').hide();
      else $('#update-app-form .danger').hide();
    } else {
      if (type === 'upload-new') $('#upload-new-app-form .danger').show();
      else $('#update-app-form .danger').show();
    }
    if (apps.length) {
      if (type === 'upload-new') {
        for (let i=0; i < apps.length;i++) {
          let curApp = apps[i];
          if (curApp.appName === appName) {
            allowSbmt2 = false;
            $('#danger-creating-app').show();
            break;
          }
        }
      } else {
        for (let i=0; i < apps.length;i++) {
          let curApp = apps[i];
          if (curApp.appName === appName && curApp.appId !== curAppId) {
            allowSbmt2 = false;
            $('#update-danger-creating-app').show();
            break;
          }
        }
      }
    }
    if (!allowSbmt2 || !validGitHubURL) return;
    if ((allowSbmt === 5) && allowSbmt2 && validGitHubURL) {
      if (type === 'upload-new') {
        $('#danger-creating-app').hide();
        $('#upload-new-app-form').submit();
      } else {
        $('#update-danger-creating-app').hide();
        $('#update-app-form').submit();
      }
    }
  }
  // Function to get placeholder image if no image is uploaded
  async function getPlaceholderImage() {
    let noImageURL = $('#templates #no-image').attr('src');  // Get the placeholder URL
    try {
        const response = await fetch(noImageURL);  // Fetch the placeholder image
        const blob = await response.blob();  // Convert to blob
        return new File([blob], "no-image.png", { type: "image/png", lastModified: new Date() });  // Create a File object
    } catch (error) {
        console.error('Error fetching placeholder image:', error);
    }
  }
  // Function to compress the image
  function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve) => {
      if (!file) {
        // If no file is provided, resolve with null
        resolve(null);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
          // Use OffscreenCanvas if supported for better performance
          const canvas = typeof OffscreenCanvas !== 'undefined' 
                        ? new OffscreenCanvas(img.width, img.height) 
                        : document.createElement('canvas');

          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.convertToBlob ? canvas.convertToBlob({ type: 'image/jpeg', quality })
            .then(blob => resolve(blob))
            : canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  // Sanitize file name to remove special characters
  function sanitizeFileName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  }
  const { createFFmpeg, fetchFile } = FFmpeg;
  // Function to compress the video
  async function compressVideo(file, targetSize) {
    if (!file) {
      console.log('No video file provided');
      return null;
    }
  
    console.log('Starting video compression');
    const sanitizedFileName = sanitizeFileName(file.name);
    const ffmpeg = createFFmpeg({ log: true });
  
    try {
      console.log('Loading FFmpeg');
      await ffmpeg.load();
      console.log('FFmpeg loaded successfully');
  
      console.log('Writing file to FFmpeg filesystem');
      ffmpeg.FS('writeFile', sanitizedFileName, await fetchFile(file));
  
      console.log('Running FFmpeg compression');
      await ffmpeg.run(
        '-i', sanitizedFileName,
        '-c:v', 'libx264',
        '-crf', '30',
        '-preset', 'ultrafast',
        '-vf', 'scale=1280:-2',
        '-r', '24',
        '-c:a', 'aac',
        '-b:a', '128k',
        'output.mp4'
      );
  
      console.log('Reading compressed file');
      const data = ffmpeg.FS('readFile', 'output.mp4');
      console.log('Compressed file size:', data.length);
  
      return new Blob([data.buffer], { type: 'video/mp4' });
  
    } catch (error) {
      console.error('Error processing video with FFmpeg:', error);
      return null;
    } finally {
      try {
        console.log('Cleaning up FFmpeg filesystem');
        if (ffmpeg.FS('readdir', '/').includes(sanitizedFileName)) {
          ffmpeg.FS('unlink', sanitizedFileName);
        }
        if (ffmpeg.FS('readdir', '/').includes('output.mp4')) {
          ffmpeg.FS('unlink', 'output.mp4');
        }
        console.log('Cleanup completed');
      } catch (cleanupError) {
        console.error('Error cleaning up FFmpeg FS:', cleanupError);
      }
    }
  }
  updateProfileInfo = function() {
    $('.my-profile-name').html(currentUser.Name);
    $('#update-account-firstName').val(currentUser.FirstName);
    $('#update-account-lastName').val(currentUser.LastName);
    $('.my-profile-email').html(currentUser.EmailAddress);
    $('#update-account-email').val(currentUser.EmailAddress);
    $('.my-profile-username').html(currentUser.Username);
    $('#update-account-username').val(currentUser.Username);
    $('.my-profile-password').html('••••••••');
    $('#update-account-password').val('••••••••');        
    $('.my-profile-bio').html(currentUser.PersonalDescription);
    $('#update-account-bio').val(currentUser.PersonalDescription);
  }
  function updateMyProfileApps(myProfileApps) {
    $('#my-profile-apps').empty();
    if (myProfileApps.length) {
      myProfileApps.forEach(function(app) {
          if (app.userId === currentUser.userId) {
              let myProfileApp = $('#templates .my-profile-app-to-display').clone();
              myProfileApp.attr('data-appId', app.Id);
              myProfileApp.find('h2').html(app.DisplayName);
              myProfileApp.find('img').attr('src', `${app.PreviewImageFile}`);
              $('#my-profile-apps').append(myProfileApp);
          }
      });
    }
  }
});
export {updateProfileInfo};