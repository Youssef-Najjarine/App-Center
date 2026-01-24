import React from "react";
import { Outlet } from "react-router-dom";

import HomeNavbarDesktop from "@components/HomeNavBar/HomeNavbarDesktop";
import HomeNavbarMobile from "@components/HomeNavBar/HomeNavbarMobile";
import ProfileNavbarDesktop from "@components/ProfileNavbar/ProfileNavbarDesktop";
import ProfileNavbarMobile from "@components/ProfileNavbar/ProfileNavbarMobile";

import Footer from "@components/Footer/Footer";
import ContactUs from "@components/ContactUs/ContactUs";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";

import { useAuthUser } from "@context/AuthUserContext";

const SiteLayout = () => {
  const { isSignedIn, loading, authBusy } = useAuthUser();

  if (loading || authBusy) {
    return <ProcessingModal />;
  }

  return (
    <section className="container">
      {isSignedIn ? (
        <>
          <ProfileNavbarDesktop />
          <ProfileNavbarMobile />
        </>
      ) : (
        <>
          <HomeNavbarDesktop />
          <HomeNavbarMobile />
        </>
      )}

      <Outlet />

      {!isSignedIn && (
        <>
          <ContactUs />
          <Footer />
        </>
      )}
    </section>
  );
};

export default SiteLayout;
