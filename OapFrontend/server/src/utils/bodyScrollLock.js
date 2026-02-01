let lockCount = 0;

let saved = {
  overflow: "",
  position: "",
  top: "",
  width: "",
  paddingRight: "",
  scrollY: 0,
};

const getScrollbarWidth = () =>
  window.innerWidth - document.documentElement.clientWidth;

export const lockScroll = () => {
  lockCount += 1;
  if (lockCount > 1) return;

  const body = document.body;

  saved.scrollY = window.scrollY || window.pageYOffset || 0;
  saved.overflow = body.style.overflow;
  saved.position = body.style.position;
  saved.top = body.style.top;
  saved.width = body.style.width;
  saved.paddingRight = body.style.paddingRight;

  const scrollbarWidth = getScrollbarWidth();
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }

  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${saved.scrollY}px`;
  body.style.width = "100%";
};

export const unlockScroll = () => {
  if (lockCount === 0) {
    return;
  }

  lockCount -= 1;

  if (lockCount <= 0) {
    lockCount = 0;

    const body = document.body;

    body.style.overflow = saved.overflow;
    body.style.position = saved.position;
    body.style.top = saved.top;
    body.style.width = saved.width;
    body.style.paddingRight = saved.paddingRight;

    window.scrollTo(0, saved.scrollY);
  }
};

export const forceUnlockScroll = () => {
    lockCount = 0;

    const body = document.body;
    const html = document.documentElement;

    body.style.overflow = "";
    body.style.position = "";
    body.style.top = "";
    body.style.width = "";
    body.style.paddingRight = "";

    html.style.overflow = "";
};
