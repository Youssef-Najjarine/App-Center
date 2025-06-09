import { updateProfileInfo } from './core-functionality.js';
$(document).ready(function() {
    $('.scrollLink').click(function (event) {
        event.preventDefault();
        $('.burger-menu').css('display','none');
        $('html').animate({
            scrollTop: $($(this).attr('href')).offset().top
        }, 500);
    });
    $(window).on('scroll', function (e) {
    let homePage = ($(window).scrollTop() + $(window).innerHeight() > $("#home").offset().top) && ($(window).scrollTop() < $("#home").offset().top + $("#home").outerHeight());
    let aboutPage = ($(window).scrollTop() + $(window).innerHeight() > $("#about").offset().top) && ($(window).scrollTop() < $("#about").offset().top + $("#about").outerHeight());
    let applicationsPage = ($(window).scrollTop() + $(window).innerHeight() > $("#applications").offset().top) && ($(window).scrollTop() < $("#applications").offset().top + $("#applications").outerHeight());
    let blogPage = ($(window).scrollTop() + $(window).innerHeight() > $("#blog").offset().top) && ($(window).scrollTop() < $("#blog").offset().top + $("#blog").outerHeight());
    let contactPage = ($(window).scrollTop() + $(window).innerHeight() > $("#contact").offset().top) && ($(window).scrollTop() < $("#contact").offset().top + $("#contact").outerHeight());
    if (homePage) {
        $('.fixed-top').removeClass('white-bg');
        $(".fixed-top .second-nav-div a:not(a[href='#home'])").removeClass('blue-curPage blue-underlined').addClass('white-underlined');
        $(".fixed-top .second-nav-div a[href='#home']").addClass('white-curPage').removeClass('white-underlined blue-underlined');
        $('.fixed-top a,.profile-icon').addClass('white-text').removeClass('blue-text');
    } else if (applicationsPage) {
        $('.fixed-top').addClass('white-bg');
        $(".fixed-top .second-nav-div a:not(a[href='#applications'])").removeClass('white-curPage blue-curPage').addClass('blue-underlined');
        $(".fixed-top .second-nav-div a[href='#applications']").addClass('blue-curPage').removeClass('white-underlined blue-underlined');
        $('.fixed-top a,.profile-icon').addClass('blue-text').removeClass('white-text');
    } else if (blogPage) {
        $('.fixed-top').addClass('white-bg');
        $(".fixed-top .second-nav-div a:not(a[href='#blog'])").removeClass('white-curPage blue-curPage').addClass('blue-underlined');
        $(".fixed-top .second-nav-div a[href='#blog']").addClass('blue-curPage').removeClass('white-underlined blue-underlined');
        $('.fixed-top a,.profile-icon').addClass('blue-text').removeClass('white-text');
    } else if (aboutPage) {
        $('.fixed-top').addClass('white-bg');
        $(".fixed-top .second-nav-div a:not(a[href='#about'])").removeClass('white-curPage blue-curPage').addClass('blue-underlined');
        $(".fixed-top .second-nav-div a[href='#about']").addClass('blue-curPage').removeClass('white-underlined blue-underlined');
        $('.fixed-top a,.profile-icon').addClass('blue-text').removeClass('white-text');
    } else if (contactPage) {
        $('.fixed-top').addClass('white-bg');
        $(".fixed-top .second-nav-div a:not(a[href='#contact'])").removeClass('white-curPage blue-curPage').addClass('blue-underlined');
        $(".fixed-top .second-nav-div a[href='#contact']").addClass('blue-curPage').removeClass('white-underlined blue-underlined');
        $('.fixed-top a,..profile-icon').addClass('blue-text').removeClass('white-text');
    }
    });
    $('#burgerIcon').click(function() {
        $('.burger-menu').toggle('active');
    })
    function toggleAppModal() {
        $(".appBackdropSec").toggle("active");
        $("body").css("overflow", "hidden");
        $('.appsModal').empty();
        let demoHeader = $(this).closest('.workbox').find('.work-content .w-title').clone();
        let demoToClone = $(this).closest('.workbox').find('.demo').clone();
        demoToClone.removeClass('hidden');
        $('.appsModal').append('<div class="closeModalDiv"></div>');
        $('.appsModal').append('<div class="appModalEntry"></div');
        $('.appsModal .closeModalDiv').append(demoHeader);
        $('.appsModal .closeModalDiv').append(`<button class='closeX closeAppModel'>close</button>`);
        $('.appModalEntry').append(demoToClone);
        const techStackToClone = $(this).closest('.workbox').find('.tech-stack').clone();
        $('.appModalEntry').append(techStackToClone);
        techStackToClone.removeClass('hidden');
        const conclusionToClone = $(this).closest('.workbox').find('.appsConclusion').clone();
        $('.appModalEntry').append(conclusionToClone);
        conclusionToClone.removeClass('hidden');
        const RepositoryUrl = $(this).closest('.workbox').find('.RepositoryUrl').attr('href');
        if (RepositoryUrl) {
            $('.appsModal').append(`
                <div class="btmCloseDiv">
                    <a href="${RepositoryUrl}" target="_blank">
                        <span class="ico-circle">
                            <i class="fa-brands fa-github about-ico"></i>
                        </span>
                    </a>
                    <button class="closeAppModel">Close</button>
                </div>
            `);
        } else {
            $('.appsModal').append(`
                <div class="btmCloseDiv">
                    <span></span>
                    <button class="closeAppModel">Close</button>
                </div>
            `);
        }
    }
    function toggleCloseAppModel() {
        $('body').css('overflow', 'auto');
        $(".appBackdropSec").toggle("active");
    }
    $(".appBackdrop").click(() => toggleCloseAppModel());
    $(document).on('click', '.closeAppModel', toggleCloseAppModel);
    $(document).on('click', '.viewAppDemo', toggleAppModal);
    function toggleBlogModal() {
        $('body').css('overflow', 'hidden');
        $(".blogBackdropSec").toggle("active");
        $('.blogModal').empty();
        let demoHeader = $(this).closest('.card').find('h4').clone();
        let picToClone = $(this).closest('.card').find('.blogPhoto').clone();
        $('.blogModal').append('<div class="closeBlogModalDiv"></div>');
        $('.blogModal .closeBlogModalDiv').append(demoHeader);
        $('.blogModal .closeBlogModalDiv').append(`<button class='closeXBlog closeBlogModel'>close</button>`);
        const blogEntryToClone = $(this).closest('.card').find('.blogEntry').clone();
        blogEntryToClone.removeClass('hidden');
        $('.blogModal').append(blogEntryToClone);

        $('.blogModal').append(`
            <div class="btmBlogCloseDiv">
                <button class="closeBlogModel">Close</button>
            </div>
        `);
    }
    function toggleCloseBlogModel() {
        $('body').css('overflow', 'auto');
        $(".blogBackdropSec").toggle("active");
    }
    $(".blogBackdrop").click(() => toggleCloseBlogModel());
    $(document).on('click', '.closeBlogModel', toggleCloseBlogModel);
    $(document).on('click', '.viewBlog', toggleBlogModal);
    $('.profile-icon').click(function() {
        $('#show-profile-apps').addClass('active');
        $('#show-profile-settings').removeClass('active');
        $('#my-profile-apps,#my-profile-new-app').show();
        $('#my-profile-settings,#my-app-upload,#update-app-form').hide();
        $(".profileBackdropSec").toggle("active");
        $("body").css("overflow", "hidden");
    })
    $('.profileBackdrop,.my-profile-X').click(function() {
        $(".profileBackdropSec").toggle("active");
        $("body").css("overflow", "auto");
    })
    $('#show-create-account').click(function() {
        $('#create-account-firstName,#create-account-lastName,#create-account-email,#create-account-username,#create-account-password').val('');
        $('#login-div,#verifyNewAccount').hide();
        $('#create-account-div').show();
        $('#create-account-form .danger,#danger-creating-account,#passwordError,#emailError,#usernameError').hide();
    })
    $('.back-arrow').click(function() {
        $('#login-user-email,#login-password').val('');
        $('#remember-me-login').prop('checked', false);
        $('#login-div').show();
        $('#login-form .danger,#wrong-login-danger,#email-not-verified-danger,#create-account-div,#forgot-password-div').hide();
    })
    $('.close-sign-in-out').click(function() {
    $("body").css("overflow", "auto");
    $('#login-container').toggle('active');
    })
    $('.logIn').click(function() {
    $("body").css("overflow", "hidden");
    $('.burger-menu').css('display','none');
    $('#login-user-email,#login-password').val('');
    $('#remember-me-login').prop('checked', false);
    $('#login-form .danger,#wrong-login-danger,#email-not-verified-danger,#create-account-div,#verifyNewAccount,#passwordResetSubmitted,#forgot-password-div').hide();
    $('#login-container').toggle('active');
    $('#login-div').show();
    })
    $('.forgotPassword').click(function() {
        $('#forgot-password-username-email').val('');
        $('#login-div, #forgot-password-div .danger').hide();
        $('#forgot-password-div').show();
      });
    $('.login-bgImg').click(function() {
    $("body").css("overflow", "auto");
    $('.burger-menu').css('display','none');
    $('#login-user-email,#login-password').val('');
    $('#login-form .danger,#wrong-login-danger,#email-not-verified-danger,#create-account-div').hide();
    $('#login-container').toggle('active');
    $('#login-div').show();
    })
    $('#show-profile-settings').click(function() {
        $(`#my-profile-apps,#my-profile-new-app,#my-app-upload,.update-my-profile-info,
          #updateEmailError,#updateUsernameError,#updatePasswordError,
          #update-my-profile-info-form .danger`).hide();
        $('#my-profile-settings,.my-profile-personals').show();
        $(".my-profile-apps").removeClass("active");
        $('.my-profile-settings').addClass('active');
    })
    $('#cancel-changes-my-profile-info').click(function() {
        $(`#my-profile-apps,#my-profile-new-app,.update-my-profile-info,#updateEmailError,
            #updateUsernameError,#updatePasswordError,
            #update-my-profile-info-form .danger`).hide();
        $('#my-profile-settings,.my-profile-personals').show();
    })
    $('#update-my-profile-info').click(function() {
        updateProfileInfo();
        $('.my-profile-personals,#updateEmailError,#updateUsernameError,#updatePasswordError').hide();
        $('.update-my-profile-info').show();
    })
    $('#show-profile-apps').click(function() {
        $('#my-profile-apps,#my-profile-new-app').show();
        $('#my-profile-settings,#my-app-upload,#update-app-form').hide();
        $(".my-profile-apps").addClass("active");
        $('.my-profile-settings').removeClass('active');
    })
    $('#cancel-update-app').click(function() {
        $('#my-profile-apps,#my-profile-new-app').show();
        $('#my-profile-settings,#my-app-upload,#update-app-form').hide();
        $(".my-profile-apps").addClass("active");
    })
    $('#my-profile-new-app').click(function() {
        $(`#upload-new-app-name,#upload-new-app-tag-line,#upload-new-app-short-desc,
            #upload-new-app-tech-stack,#upload-new-app-conclusion,#upload-new-app-repo-link,
            #upload-new-app-image,#upload-new-app-demo`).val('');
        $('#my-profile-apps,#upload-new-app-form .danger,#danger-creating-app, #upload-new-app-form #repo-danger').hide();
        $('#show-profile-apps').removeClass('active');
        $('#my-app-upload,#upload-new-app-form').show();
    })
});